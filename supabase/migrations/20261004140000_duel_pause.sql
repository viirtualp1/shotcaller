-- A shared pause in duels, as in Dota. Each coach may pause twice per duel, 90 seconds apart. The coach who paused
-- can resume at once, the other after 10 seconds, and a pause ends on its own after 60. Both devices learn about a
-- pause from the duel row they already watch, so pausing costs one call and adds no subscriptions or polling.
-- Safe to run again: every statement checks what is already there.
alter table public.duels
  add column if not exists paused_by uuid,
  add column if not exists paused_at timestamptz,
  add column if not exists host_pauses smallint not null default 0 check (host_pauses between 0 and 2),
  add column if not exists guest_pauses smallint not null default 0 check (guest_pauses between 0 and 2),
  add column if not exists host_paused_last timestamptz,
  add column if not exists guest_paused_last timestamptz;

-- The part of a running pause that counts: never more than its 60 seconds.
create or replace function public.duel_pause_elapsed(game public.duels)
returns interval
language sql
stable
set search_path = ''
as $$
  select case
    when game.paused_at is null then interval '0'
    else least(now() - game.paused_at, interval '60 seconds')
  end
$$;

create or replace function public.pause_duel(duel uuid)
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
    raise exception 'The duel is over' using errcode = 'P0410';
  end if;

  -- A pause past its 60 seconds is over even if nobody resumed it yet.
  if game.paused_at is not null and now() - game.paused_at < interval '60 seconds' then
    raise exception 'The duel is already paused' using errcode = 'P0409';
  end if;

  if (case when my_side = 0 then game.host_pauses else game.guest_pauses end) >= 2 then
    raise exception 'No pauses left' using errcode = 'P0429';
  end if;

  if (case when my_side = 0 then game.host_paused_last else game.guest_paused_last end)
    > now() - interval '90 seconds' then
    raise exception 'Paused too recently' using errcode = 'P0425';
  end if;

  update public.duels
  set
    round_opened_at = round_opened_at + public.duel_pause_elapsed(game),
    paused_by = auth.uid(),
    paused_at = now(),
    host_pauses = host_pauses + (1 - my_side),
    guest_pauses = guest_pauses + my_side,
    host_paused_last = case when my_side = 0 then now() else host_paused_last end,
    guest_paused_last = case when my_side = 1 then now() else guest_paused_last end
  where id = duel;
end;
$$;

-- Resuming moves the round clock on by the time spent paused, so the waiting coach cannot claim the win early.
create or replace function public.resume_duel(duel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
begin
  select * into game from public.duels where id = duel for update;

  if not found or auth.uid() not in (game.host, game.guest) then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.paused_at is null then
    return;
  end if;

  if auth.uid() <> game.paused_by and now() - game.paused_at < interval '10 seconds' then
    raise exception 'Too early to resume' using errcode = 'P0425';
  end if;

  update public.duels
  set
    round_opened_at = round_opened_at + public.duel_pause_elapsed(game),
    paused_by = null,
    paused_at = null
  where id = duel;
end;
$$;

revoke execute on function public.duel_pause_elapsed(public.duels) from public, anon, authenticated;
revoke execute on function public.pause_duel(uuid) from public, anon;
revoke execute on function public.resume_duel(uuid) from public, anon;
grant execute on function public.pause_duel(uuid) to authenticated;
grant execute on function public.resume_duel(uuid) to authenticated;

-- A paused round keeps its time: the claim waits for the pause, up to its 60 seconds.
-- Stale duels are settled two minutes after the timeout, which already covers the longest pause.
create or replace function public.claim_duel(duel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
begin
  select * into game from public.duels where id = duel for update;

  if not found or auth.uid() not in (game.host, game.guest) then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status <> 'active' then
    return;
  end if;

  if game.round_opened_at + public.duel_pause_elapsed(game) > now() - public.duel_round_timeout() then
    raise exception 'The opponent still has time' using errcode = 'P0425';
  end if;

  perform public.lock_coaches(game.host, game.guest);
  game := public.resolve_stale_duel(game, false);

  if game.status = 'active' then
    raise exception 'Nothing to claim yet' using errcode = 'P0425';
  end if;
end;
$$;

-- A device that reloads during a pause learns about it with the duel itself.
drop function if exists public.my_duels();

create function public.my_duels()
returns table (
  id uuid,
  host uuid,
  guest uuid,
  status text,
  mode text,
  ranked boolean,
  seed text,
  round integer,
  round_opened_at timestamptz,
  host_board_round integer,
  guest_board_round integer,
  created_at timestamptz,
  paused_by uuid,
  paused_at timestamptz,
  host_pauses smallint,
  guest_pauses smallint,
  host_paused_last timestamptz,
  guest_paused_last timestamptz,
  opponent_name text,
  opponent_avatar text,
  opponent_photo text,
  opponent_rating integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id, d.host, d.guest, d.status, d.mode, d.ranked, d.seed, d.round, d.round_opened_at,
    d.host_board_round, d.guest_board_round, d.created_at,
    d.paused_by, d.paused_at, d.host_pauses, d.guest_pauses, d.host_paused_last, d.guest_paused_last,
    c.name, c.avatar,
    case when public.are_friends(auth.uid(), c.id) then c.photo end,
    coalesce(r.rating, 0)
  from public.duels d
  join public.coaches c on c.id = case when d.host = auth.uid() then d.guest else d.host end
  left join public.ratings r on r.coach_id = c.id and r.mode = d.mode
  where auth.uid() in (d.host, d.guest)
    and (
      (d.status = 'active' and case when d.host = auth.uid() then d.host_result else d.guest_result end is null)
      or (d.status = 'invited' and d.created_at > now() - interval '60 seconds')
    )
  order by d.created_at desc
$$;

revoke execute on function public.my_duels() from public, anon;
grant execute on function public.my_duels() to authenticated;
