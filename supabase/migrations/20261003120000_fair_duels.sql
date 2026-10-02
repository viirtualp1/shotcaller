-- Fair duels and matchmaking.
-- Ratings move by Elo: beating a stronger coach is worth more than beating a weaker one, and two coaches trading
-- wins conserve points above the zero floor. A side's first report is final, and once a coach has reported, the duel no longer
-- holds them up. A round that runs out of time is settled from what the server saw: a report stands when the other
-- side went quiet, and becomes a dispute when the other side kept playing. Disputes are counted for investigation.
-- Coaches without a friend to play can queue for a duel
-- with a stranger of similar rating in a mode.

alter table public.duels drop constraint duels_status_check;

alter table public.duels add constraint duels_status_check
  check (status in ('invited', 'declined', 'cancelled', 'expired', 'active', 'finished', 'disputed', 'abandoned'));

-- Set for a duel found through the queue; friends' duels are invites.
alter table public.duels add column ranked boolean not null default false;

create index duels_active on public.duels (round_opened_at) where status = 'active';

-- Grows by one with every disputed duel and fades with every settled one.
alter table public.coaches add column dispute_score real not null default 0 check (dispute_score >= 0);

-- Ratings and disputes are only ever changed through the duel functions, which lock both coaches first.
create function public.lock_coaches(a uuid, b uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(a, b)::text, 1));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(greatest(a, b)::text, 1));
end;
$$;

-- A coach is held by an active duel until they have reported its result.
create or replace function public.in_active_duel(coach uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.duels d
    where d.status = 'active'
      and ((d.host = coach and d.host_result is null) or (d.guest = coach and d.guest_result is null))
  )
$$;

-- Rating points for one coach's result, Elo with K = 50 on the usual 400-point scale: 25 between equals.
-- The game's ratingChange works it out the same way. Every result moves the rating by at least one point.
create function public.elo_change(mine integer, theirs integer, won boolean)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when won then greatest(1, round(50 * (1 - 1 / (1 + power(10::numeric, (theirs - mine) / 400.0)))))::integer
    else -greatest(1, round(50 / (1 + power(10::numeric, (theirs - mine) / 400.0))))::integer
  end
$$;

-- Whatever follows a duel's end: ratings, the dispute record and the boards, which nothing reads any more.
create function public.settle_duel(game public.duels)
returns void
language plpgsql
set search_path = ''
as $$
declare
  loser uuid;
  winner_rating integer;
  loser_rating integer;
  gain integer;
  loss integer;
begin
  delete from public.duel_boards where duel_id = game.id;

  if game.status = 'disputed' then
    update public.coaches set dispute_score = dispute_score + 1 where id in (game.host, game.guest);

    return;
  end if;

  if game.status <> 'finished' then
    return;
  end if;

  update public.coaches set dispute_score = dispute_score * 0.8 where id in (game.host, game.guest);

  if game.winner is null then
    return;
  end if;

  loser := case when game.winner = game.host then game.guest else game.host end;

  insert into public.ratings (coach_id, mode)
  values (game.winner, game.mode), (loser, game.mode)
  on conflict (coach_id, mode) do nothing;

  perform 1
  from public.ratings
  where mode = game.mode and coach_id in (game.winner, loser)
  order by coach_id
  for update;

  select rating into winner_rating from public.ratings where coach_id = game.winner and mode = game.mode;
  select rating into loser_rating from public.ratings where coach_id = loser and mode = game.mode;

  gain := public.elo_change(winner_rating, loser_rating, true);
  loss := -public.elo_change(loser_rating, winner_rating, false);

  update public.ratings
  set rating = rating + gain, peak = greatest(peak, rating + gain)
  where coach_id = game.winner and mode = game.mode;

  update public.ratings
  set rating = greatest(0, rating - loss)
  where coach_id = loser and mode = game.mode;

  update public.coaches c
  set rating = (select coalesce(max(r.rating), 0) from public.ratings r where r.coach_id = c.id), updated_at = now()
  where c.id in (game.winner, loser);
end;
$$;

-- Settles an active duel whose round has run out of time, from what the server saw:
-- one side reported and the other went quiet: the report stands;
-- one side reported but the other sent a board for the round after it: the two disagree, so it is disputed;
-- nobody reported and only one side sent this round's board: that side wins on time;
-- otherwise nobody can be blamed, and the duel is abandoned only when `abandon` is set.
-- The caller holds the row lock.
create function public.resolve_stale_duel(game public.duels, abandon boolean)
returns public.duels
language plpgsql
set search_path = ''
as $$
declare
  host_sent constant boolean := public.duel_board_sent(game.id, game.round, 0::smallint);
  guest_sent constant boolean := public.duel_board_sent(game.id, game.round, 1::smallint);
  reported constant smallint := coalesce(game.host_result, game.guest_result);
begin
  if reported is not null then
    if (game.host_result is null and host_sent) or (game.guest_result is null and guest_sent) then
      update public.duels
      set status = 'disputed', ended_by = 'result', finished_at = now()
      where id = game.id
      returning * into game;
    else
      update public.duels
      set
        status = 'finished',
        winner = case reported when 0 then host when 1 then guest end,
        ended_by = 'result',
        finished_at = now()
      where id = game.id
      returning * into game;
    end if;
  elsif host_sent <> guest_sent then
    update public.duels
    set
      status = 'finished',
      winner = case when host_sent then host else guest end,
      ended_by = 'timeout',
      finished_at = now()
    where id = game.id
    returning * into game;
  elsif abandon then
    update public.duels set status = 'abandoned', finished_at = now() where id = game.id returning * into game;
  else
    return game;
  end if;

  perform public.settle_duel(game);

  return game;
end;
$$;

create or replace function public.respond_duel(duel uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := auth.uid();
  invite public.duels;
begin
  -- Queue pairing and invitation acceptance share this lock, before touching either queue or duel rows.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('match_queue', 2));

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

  if not public.are_friends(invite.host, me) or public.is_blocked(invite.host, me) then
    raise exception 'The friendship ended' using errcode = '42501';
  end if;

  -- Two invites accepted at once must not put a coach in two duels.
  perform public.lock_coaches(invite.host, me);

  if public.in_active_duel(invite.host) or public.in_active_duel(me) then
    raise exception 'A duel is already on' using errcode = 'P0409';
  end if;

  delete from public.match_queue where coach_id in (invite.host, me);

  update public.duels
  set status = 'active', seed = gen_random_uuid()::text, started_at = now(), round_opened_at = now()
  where id = duel;
end;
$$;

-- Sends this side's board for the current round and returns the other side's if it is already in.
-- Sending again (after a reload) keeps the first board: a board cannot be changed once sent.
-- Only the boards of the round just finished are kept, for a device that reloads before reading them.
create or replace function public.submit_board(duel uuid, board_round integer, payload jsonb)
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

  if board_round = game.round - 1 and public.duel_board_sent(duel, board_round, my_side) then
    select b.board into theirs
    from public.duel_boards b
    where b.duel_id = duel and b.round = board_round and b.side = 1 - my_side;

    return theirs;
  end if;

  if board_round <> game.round then
    raise exception 'Wrong round' using errcode = 'P0409';
  end if;

  if (my_side = 0 and game.host_result is not null) or (my_side = 1 and game.guest_result is not null) then
    raise exception 'The result was already reported' using errcode = 'P0410';
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

    delete from public.duel_boards where duel_id = duel and round < board_round;
  end if;

  return theirs;
end;
$$;

-- Both devices report the result they replayed. A side's first report is final: sending it again changes nothing.
create or replace function public.report_duel(duel uuid, winning_side smallint, by_throne boolean default false)
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

  if (my_side = 0 and game.host_result is not null) or (my_side = 1 and game.guest_result is not null) then
    return;
  end if;

  perform public.lock_coaches(game.host, game.guest);

  if my_side = 0 then
    game.host_result := reported;
    game.host_throne := coalesce(by_throne, false);
  else
    game.guest_result := reported;
    game.guest_throne := coalesce(by_throne, false);
  end if;

  update public.duels
  set host_result = game.host_result, guest_result = game.guest_result,
    host_throne = game.host_throne, guest_throne = game.guest_throne
  where id = duel;

  if game.host_result is null or game.guest_result is null then
    return;
  end if;

  update public.duels
  set
    status = case when game.host_result = game.guest_result then 'finished' else 'disputed' end,
    winner = case when game.host_result = game.guest_result then
      case game.host_result when 0 then game.host when 1 then game.guest end
    end,
    ended_by = 'result',
    finished_at = now()
  where id = duel
  returning * into game;

  perform public.settle_duel(game);
end;
$$;

-- Giving up is a loss; a coach who has already reported has nothing left to give up.
create or replace function public.forfeit_duel(duel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
begin
  select * into game
  from public.duels
  where id = duel
    and status = 'active'
    and ((host = auth.uid() and host_result is null) or (guest = auth.uid() and guest_result is null))
  for update;

  if not found then
    return;
  end if;

  perform public.lock_coaches(game.host, game.guest);

  update public.duels
  set
    status = 'finished',
    winner = case when host = auth.uid() then guest else host end,
    ended_by = 'forfeit',
    finished_at = now()
  where id = duel
  returning * into game;

  perform public.settle_duel(game);
end;
$$;

-- Settles a duel whose round ran out of time; see resolve_stale_duel. Nothing to settle yet is 'tooEarly'.
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

  if game.round_opened_at > now() - public.duel_round_timeout() then
    raise exception 'The opponent still has time' using errcode = 'P0425';
  end if;

  perform public.lock_coaches(game.host, game.guest);
  game := public.resolve_stale_duel(game, false);

  if game.status = 'active' then
    raise exception 'Nothing to claim yet' using errcode = 'P0425';
  end if;
end;
$$;

-- Open invites, and active duels the caller has not reported yet, with the other coach's card.
-- The rating shown is the one in the duel's mode; a stranger's picture stays with their friends.
drop function public.my_duels();

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

-- Coaches looking for a duel with a stranger. A row lives while its coach keeps asking, every few seconds.
create table public.match_queue (
  coach_id uuid primary key references public.coaches (id) on delete cascade,
  mode text not null check (mode in ('threeLanes', 'twoLanes', 'oneLane')),
  rating integer not null,
  -- Different battle rules cannot produce agreeing replays.
  balance text not null check (char_length(balance) between 1 and 32),
  joined_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);

comment on table public.match_queue is 'Coaches waiting for a ranked duel. Only the matchmaking functions use it.';

create index match_queue_by_mode on public.match_queue (mode, balance, rating);

alter table public.match_queue enable row level security;
revoke all on table public.match_queue from anon, authenticated;

-- The rating gap a coach accepts: 100 at first, 10 more for every second of waiting, at most 1000.
create function public.queue_reach(waited interval)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(100 + 10 * greatest(0, floor(extract(epoch from waited)))::integer, 1000)
$$;

-- The ranked duel just found for the caller, if there is one they have not reported yet.
create function public.found_duel(coach uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select d.id
  from public.duels d
  where d.ranked
    and d.status = 'active'
    and ((d.host = coach and d.host_result is null) or (d.guest = coach and d.guest_result is null))
  order by d.started_at desc
  limit 1
$$;

-- Joins the queue for a mode, or keeps the caller in it, and pairs them with the closest coach in reach.
-- Returns the duel once one is found, by this call or by another coach's; null while still waiting.
-- The waiting coach hosts. A coach who stops asking leaves the queue after 30 seconds.
create function public.find_match(game_mode text, game_balance text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := (public.ensure_coach()).id;
  found_id uuid;
  mine public.match_queue;
  rival public.match_queue;
begin
  if game_mode is null or game_mode not in ('threeLanes', 'twoLanes', 'oneLane') then
    raise exception 'Unknown game mode' using errcode = '22023';
  end if;

  if game_balance is null or char_length(game_balance) not between 1 and 32 then
    raise exception 'Unknown battle rules' using errcode = '22023';
  end if;

  -- Recheck both callers after serialization: a parallel call may already have paired this coach.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('match_queue', 2));

  found_id := public.found_duel(me);

  if found_id is not null then
    delete from public.match_queue where coach_id = me;

    return found_id;
  end if;

  if public.in_active_duel(me) then
    raise exception 'A duel is already on' using errcode = 'P0409';
  end if;

  delete from public.match_queue where seen_at < now() - interval '30 seconds';

  insert into public.match_queue as q (coach_id, mode, rating, balance)
  select
    me,
    game_mode,
    coalesce((select r.rating from public.ratings r where r.coach_id = me and r.mode = game_mode), 0),
    game_balance
  from public.coaches c
  where c.id = me
  on conflict (coach_id) do update
  set
    mode = excluded.mode,
    rating = excluded.rating,
    balance = excluded.balance,
    seen_at = now(),
    joined_at = case when q.mode = excluded.mode and q.balance = excluded.balance then q.joined_at else now() end
  returning * into mine;

  select q.* into rival
  from public.match_queue q
  where q.mode = mine.mode
    and q.coach_id <> me
    and q.balance = mine.balance
    and abs(q.rating - mine.rating)
      <= greatest(public.queue_reach(now() - mine.joined_at), public.queue_reach(now() - q.joined_at))
    and not public.is_blocked(me, q.coach_id)
  order by abs(q.rating - mine.rating), q.joined_at
  limit 1;

  if not found then
    return null;
  end if;

  perform public.lock_coaches(me, rival.coach_id);

  -- The rival may have accepted a friend's invite since their last call.
  if public.in_active_duel(me) or public.in_active_duel(rival.coach_id) then
    delete from public.match_queue where coach_id = rival.coach_id;

    return null;
  end if;

  delete from public.match_queue where coach_id in (me, rival.coach_id);

  insert into public.duels (host, guest, mode, ranked, status, seed, started_at, round_opened_at)
  values (rival.coach_id, me, mine.mode, true, 'active', gen_random_uuid()::text, now(), now())
  returning id into found_id;

  return found_id;
end;
$$;

-- Leaves the queue. A duel found just before still starts: its id is returned.
create function public.leave_queue()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('match_queue', 2));

  delete from public.match_queue where coach_id = auth.uid();

  return public.found_duel(auth.uid());
end;
$$;

drop function public.apply_duel_rating(public.duels);

revoke execute on function
  public.lock_coaches(uuid, uuid),
  public.elo_change(integer, integer, boolean),
  public.settle_duel(public.duels),
  public.resolve_stale_duel(public.duels, boolean),
  public.queue_reach(interval),
  public.found_duel(uuid)
from public, anon, authenticated;

revoke execute on function
  public.my_duels(),
  public.find_match(text, text),
  public.leave_queue()
from public, anon;

grant execute on function
  public.my_duels(),
  public.find_match(text, text),
  public.leave_queue()
to authenticated;
