-- Duels between friends.
-- Both devices play the same match: each plans its own side and sends its board when ready, and both then
-- replay the same battle. The server only relays boards, keeps the round in step and settles the end.
-- A board is hidden from the opponent until they have sent theirs for that round, and cannot be changed
-- once sent. Invites expire after a minute, and a coach is in at most one active duel at a time.

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  host uuid not null references public.coaches (id) on delete cascade,
  guest uuid not null references public.coaches (id) on delete cascade,
  status text not null default 'invited'
    check (status in ('invited', 'declined', 'cancelled', 'expired', 'active', 'finished', 'disputed')),
  -- Battle seeds come from it; set when the guest accepts.
  seed text,
  -- The round both coaches are planning now.
  round integer not null default 1 check (round between 1 and 40),
  round_opened_at timestamptz,
  host_board_round integer not null default 0,
  guest_board_round integer not null default 0,
  -- What each device says the result was: 0 or 1 for the winning side, -1 for a draw.
  host_result smallint check (host_result in (-1, 0, 1)),
  guest_result smallint check (guest_result in (-1, 0, 1)),
  winner uuid references public.coaches (id) on delete set null,
  ended_by text check (ended_by in ('result', 'forfeit', 'timeout')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  check (host <> guest)
);

comment on table public.duels is 'A duel invite and, once accepted, the online match it becomes.';

create index duels_by_host on public.duels (host, status);
create index duels_by_guest on public.duels (guest, status);

create table public.duel_boards (
  duel_id uuid not null references public.duels (id) on delete cascade,
  round integer not null,
  side smallint not null check (side in (0, 1)),
  board jsonb not null check (jsonb_typeof(board) = 'object' and pg_column_size(board) <= 32768),
  submitted_at timestamptz not null default now(),
  primary key (duel_id, round, side)
);

comment on table public.duel_boards is 'The board each side fights with in a round of a duel.';

alter table public.duels enable row level security;
alter table public.duel_boards enable row level security;

revoke all on table public.duels, public.duel_boards from anon, authenticated;

-- Reads go through the functions; these selects let Realtime tell the duelists what changed.
grant select on table public.duels, public.duel_boards to authenticated;

create policy "Duelists see their duels"
on public.duels for select to authenticated
using ((select auth.uid()) in (host, guest));

-- Whether a side has sent its board for a round; used by the board policy without tripping over itself.
create function public.duel_board_sent(duel uuid, board_round integer, board_side smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.duel_boards b
    where b.duel_id = duel and b.round = board_round and b.side = board_side
  )
$$;

create function public.duel_side(duel public.duels)
returns smallint
language sql
stable
set search_path = ''
as $$
  select case when duel.host = auth.uid() then 0::smallint when duel.guest = auth.uid() then 1::smallint end
$$;

create policy "Duelists see their own board, and the other one once theirs is in"
on public.duel_boards for select to authenticated
using (
  exists (
    select 1
    from public.duels d
    where d.id = duel_boards.duel_id
      and (select auth.uid()) in (d.host, d.guest)
      and (
        duel_boards.side = public.duel_side(d)
        or public.duel_board_sent(duel_boards.duel_id, duel_boards.round, public.duel_side(d))
      )
  )
);

alter publication supabase_realtime add table public.duels, public.duel_boards;

-- The seconds a round may take before a waiting coach can claim the win:
-- a battle at normal speed, its summary, the planning time and a grace period for slow connections.
create function public.duel_round_timeout()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '180 seconds'
$$;

create function public.in_active_duel(coach uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.duels d where d.status = 'active' and coach in (d.host, d.guest)
  )
$$;

create function public.invite_duel(friend uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := (public.ensure_coach()).id;
  existing uuid;
  invited uuid;
begin
  if not public.are_friends(me, friend) then
    raise exception 'Only friends can duel' using errcode = '42501';
  end if;

  update public.duels
  set status = 'expired'
  where status = 'invited' and created_at < now() - interval '60 seconds' and (host in (me, friend) or guest in (me, friend));

  if public.in_active_duel(me) or public.in_active_duel(friend) then
    raise exception 'A duel is already on' using errcode = 'P0409';
  end if;

  select id into existing
  from public.duels
  where status = 'invited' and host = me and guest = friend;

  if found then
    return existing;
  end if;

  if (select count(*) from public.duels where host = me and created_at > now() - interval '5 minutes') >= 10 then
    raise exception 'Too many invites; slow down' using errcode = 'P0429';
  end if;

  insert into public.duels (host, guest) values (me, friend) returning id into invited;

  return invited;
end;
$$;

create function public.respond_duel(duel uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := auth.uid();
  invite public.duels;
begin
  select * into invite from public.duels where id = duel and guest = me for update;

  if not found or invite.status <> 'invited' then
    raise exception 'The invite is gone' using errcode = 'P0410';
  end if;

  if invite.created_at < now() - interval '60 seconds' then
    update public.duels set status = 'expired' where id = duel;
    raise exception 'The invite expired' using errcode = 'P0410';
  end if;

  if not accept then
    update public.duels set status = 'declined' where id = duel;

    return;
  end if;

  if public.in_active_duel(invite.host) or public.in_active_duel(me) then
    raise exception 'A duel is already on' using errcode = 'P0409';
  end if;

  update public.duels
  set status = 'active', seed = gen_random_uuid()::text, started_at = now(), round_opened_at = now()
  where id = duel;
end;
$$;

create function public.cancel_duel(duel uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.duels set status = 'cancelled' where id = duel and host = auth.uid() and status = 'invited'
$$;

-- Sends this side's board for the current round and returns the other side's if it is already in.
-- Sending again (after a reload) keeps the first board: a board cannot be changed once sent.
create function public.submit_board(duel uuid, board_round integer, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
  my_side smallint;
  theirs jsonb;
begin
  select * into game from public.duels where id = duel for update;

  my_side := case when game.host = auth.uid() then 0 when game.guest = auth.uid() then 1 end;

  if my_side is null then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status <> 'active' then
    raise exception 'The duel is over' using errcode = 'P0410';
  end if;

  -- A board for the round just finished may arrive again after a reload; it is already stored.
  if board_round = game.round - 1 and public.duel_board_sent(duel, board_round, my_side) then
    select b.board into theirs
    from public.duel_boards b
    where b.duel_id = duel and b.round = board_round and b.side = 1 - my_side;

    return theirs;
  end if;

  if board_round <> game.round then
    raise exception 'Wrong round' using errcode = 'P0409';
  end if;

  insert into public.duel_boards (duel_id, round, side, board)
  values (duel, board_round, my_side, payload)
  on conflict (duel_id, round, side) do nothing;

  select b.board into theirs
  from public.duel_boards b
  where b.duel_id = duel and b.round = board_round and b.side = 1 - my_side;

  if theirs is null then
    if my_side = 0 then
      update public.duels set host_board_round = board_round where id = duel;
    else
      update public.duels set guest_board_round = board_round where id = duel;
    end if;
  else
    update public.duels
    set
      host_board_round = board_round,
      guest_board_round = board_round,
      round = least(board_round + 1, 40),
      round_opened_at = now()
    where id = duel;
  end if;

  return theirs;
end;
$$;

-- Both devices report the result they replayed; the duel is settled when both reports are in.
create function public.report_duel(duel uuid, winning_side smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
  my_side smallint;
  reported constant smallint := coalesce(winning_side, -1);
begin
  if reported not in (-1, 0, 1) then
    raise exception 'Unknown result' using errcode = '22023';
  end if;

  select * into game from public.duels where id = duel for update;
  my_side := case when game.host = auth.uid() then 0 when game.guest = auth.uid() then 1 end;

  if my_side is null then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status <> 'active' then
    return;
  end if;

  if my_side = 0 then
    game.host_result := reported;
  else
    game.guest_result := reported;
  end if;

  update public.duels set host_result = game.host_result, guest_result = game.guest_result where id = duel;

  if game.host_result is null or game.guest_result is null then
    return;
  end if;

  update public.duels
  set
    status = case when game.host_result = game.guest_result then 'finished' else 'disputed' end,
    winner = case game.host_result when 0 then game.host when 1 then game.guest end,
    ended_by = 'result',
    finished_at = now()
  where id = duel;
end;
$$;

create function public.forfeit_duel(duel uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.duels
  set
    status = 'finished',
    winner = case when host = auth.uid() then guest else host end,
    ended_by = 'forfeit',
    finished_at = now()
  where id = duel and status = 'active' and auth.uid() in (host, guest)
$$;

-- A coach whose opponent stopped sending boards takes the win once the round has run out of time.
create function public.claim_duel(duel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
  my_side smallint;
begin
  select * into game from public.duels where id = duel for update;
  my_side := case when game.host = auth.uid() then 0 when game.guest = auth.uid() then 1 end;

  if my_side is null then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status <> 'active' then
    return;
  end if;

  if public.duel_board_sent(duel, game.round, (1 - my_side)::smallint)
     or game.round_opened_at > now() - public.duel_round_timeout()
  then
    raise exception 'The opponent still has time' using errcode = 'P0425';
  end if;

  update public.duels
  set status = 'finished', winner = auth.uid(), ended_by = 'timeout', finished_at = now()
  where id = duel;
end;
$$;

-- Open invites and active duels of the caller, with the other coach's card.
create function public.my_duels()
returns table (
  id uuid,
  host uuid,
  guest uuid,
  status text,
  seed text,
  round integer,
  round_opened_at timestamptz,
  host_board_round integer,
  guest_board_round integer,
  created_at timestamptz,
  opponent_name text,
  opponent_avatar text,
  opponent_rating integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id, d.host, d.guest, d.status, d.seed, d.round, d.round_opened_at,
    d.host_board_round, d.guest_board_round, d.created_at,
    c.name, c.avatar, c.rating
  from public.duels d
  join public.coaches c on c.id = case when d.host = auth.uid() then d.guest else d.host end
  where auth.uid() in (d.host, d.guest)
    and (d.status = 'active' or (d.status = 'invited' and d.created_at > now() - interval '60 seconds'))
  order by d.created_at desc
$$;

-- The other side's board for a round, once this side has sent its own.
create function public.duel_board(duel uuid, board_round integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select b.board
  from public.duels d
  join public.duel_boards b on b.duel_id = d.id and b.round = board_round
  where d.id = duel
    and auth.uid() in (d.host, d.guest)
    and b.side = case when d.host = auth.uid() then 1 else 0 end
    and public.duel_board_sent(duel, board_round, case when d.host = auth.uid() then 0 else 1 end::smallint)
$$;

revoke execute on function
  public.duel_board_sent(uuid, integer, smallint),
  public.duel_side(public.duels),
  public.duel_round_timeout(),
  public.in_active_duel(uuid),
  public.invite_duel(uuid),
  public.respond_duel(uuid, boolean),
  public.cancel_duel(uuid),
  public.submit_board(uuid, integer, jsonb),
  public.report_duel(uuid, smallint),
  public.forfeit_duel(uuid),
  public.claim_duel(uuid),
  public.my_duels(),
  public.duel_board(uuid, integer)
from public, anon;

-- The board policy calls these two as the reading coach.
grant execute on function
  public.duel_board_sent(uuid, integer, smallint),
  public.duel_side(public.duels)
to authenticated;

grant execute on function
  public.invite_duel(uuid),
  public.respond_duel(uuid, boolean),
  public.cancel_duel(uuid),
  public.submit_board(uuid, integer, jsonb),
  public.report_duel(uuid, smallint),
  public.forfeit_duel(uuid),
  public.claim_duel(uuid),
  public.my_duels(),
  public.duel_board(uuid, integer)
to authenticated;
