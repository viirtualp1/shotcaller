-- Ghost duels.
-- A coach who waits in the ranked queue without a rival can fight a ghost: the boards another coach played round by
-- round in a ranked duel, or a run the computer played to fill the pool before there are enough of those. The ghost's
-- board for a round comes only once the coach has sent theirs, so nobody plans against boards still to come. A ghost
-- duel moves the coach's rating by half as much as a live one; the ghost's owner is never affected and stays
-- anonymous. The arbiter (`scripts/arbiter.ts`) replays every ghost duel afterwards: a false result is turned round
-- and counts towards closing ranked like a false duel report.

-- Recorded runs: every board of one side of a ranked duel, in round order.
create table public.ghost_runs (
  id bigint generated always as identity primary key,
  -- Null for a run the computer played.
  coach_id uuid references auth.users (id) on delete cascade,
  mode text not null check (mode in ('threeLanes', 'twoLanes', 'oneLane')),
  balance text not null check (char_length(balance) between 1 and 32),
  rating integer not null check (rating >= 0),
  boards jsonb not null check (
    jsonb_typeof(boards) = 'array' and jsonb_array_length(boards) between 3 and 40 and pg_column_size(boards) <= 1048576
  ),
  source_duel uuid,
  source_side smallint check (source_side in (0, 1)),
  source_seed text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (source_duel, source_side)
);

comment on table public.ghost_runs is 'Boards of finished ranked duels, replayed as ghosts. Only the ghost functions use it.';

create index ghost_runs_pick on public.ghost_runs (mode, balance, rating);

alter table public.ghost_runs enable row level security;
revoke all on table public.ghost_runs from anon, authenticated;

create table public.ghost_duels (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches (id) on delete cascade,
  mode text not null check (mode in ('threeLanes', 'twoLanes', 'oneLane')),
  balance text not null check (char_length(balance) between 1 and 32),
  seed text not null,
  ghost_rating integer not null,
  -- A copy of the run, so the duel can be replayed whatever happens to the run.
  ghost_boards jsonb not null,
  -- The coach's boards, one per round played.
  boards jsonb not null default '[]'::jsonb check (pg_column_size(boards) <= 1048576),
  round integer not null default 1 check (round between 1 and 41),
  status text not null default 'active' check (status in ('active', 'finished')),
  -- The side that won as the coach reported it, or as the clock decided: 0 the coach, 1 the ghost, -1 a draw.
  result smallint check (result in (-1, 0, 1)),
  ended_by text check (ended_by in ('result', 'forfeit', 'abandoned', 'arbiter')),
  rating_change integer,
  rating_before integer,
  peak_before integer,
  -- Set once the arbiter has replayed it; `false_report` when the replay contradicted the coach.
  verified_at timestamptz,
  false_report boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

comment on table public.ghost_duels is 'A coach''s duel against a recorded run. Only the ghost functions use it.';

create unique index ghost_duels_one_active on public.ghost_duels (coach_id) where status = 'active';
create index ghost_duels_awaiting_arbiter on public.ghost_duels (finished_at) where status = 'finished' and verified_at is null;
create index ghost_duels_false_reports on public.ghost_duels (coach_id, finished_at) where false_report;

alter table public.ghost_duels enable row level security;
revoke all on table public.ghost_duels from anon, authenticated;

-- A ghost holds the same single-match slot as a live duel or a friend invitation.
create or replace function public.in_active_duel(coach uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.duels d
    where d.status = 'active'
      and ((d.host = coach and d.host_result is null) or (d.guest = coach and d.guest_result is null))
  ) or exists (select 1 from public.ghost_duels g where g.coach_id = coach and g.status = 'active')
$$;

-- Public metadata never contains boards or the recorded coach's identity.
create function public.ghost_summary(game public.ghost_duels)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', game.id, 'mode', game.mode, 'seed', game.seed, 'rating', game.ghost_rating,
    'round', game.round, 'status', game.status, 'result', game.result,
    'endedBy', game.ended_by, 'startedAt', game.started_at,
    'recordedRounds', jsonb_array_length(game.ghost_boards)
  )
$$;

create function public.ghost_duel(ghost uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.ghost_summary(g) from public.ghost_duels g where g.id = ghost and g.coach_id = auth.uid()
$$;

-- Recording ------------------------------------------------------------------------------------------------------

-- Keeps both sides of a ranked duel that was played out as ghost runs, with each coach's rating before it.
create function public.record_ghost_runs(game public.duels)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not game.ranked or game.balance is null or game.ended_by not in ('result', 'arbiter') then
    return;
  end if;

  insert into public.ghost_runs (coach_id, mode, balance, rating, boards, source_duel, source_side, source_seed)
  select
    case b.side when 0 then game.host else game.guest end,
    game.mode,
    game.balance,
    coalesce(
      (
        select r.rating
        from public.ratings r
        where r.coach_id = case b.side when 0 then game.host else game.guest end and r.mode = game.mode
      ),
      0
    ),
    jsonb_agg(b.board order by b.round), game.id, b.side, game.seed
  from public.duel_boards b
  where b.duel_id = game.id
  group by b.side
  having count(*) between 3 and 40
  on conflict (source_duel, source_side) do nothing;
end;
$$;

-- As before (20261007180000_ranked_integrity), but a ranked duel played out leaves its boards as ghost runs first.
create or replace function public.settle_duel(game public.duels)
returns void
language plpgsql
set search_path = ''
as $$
declare
  early constant boolean := game.ended_by in ('forfeit', 'timeout') and game.round <= 3;
  loser uuid;
  winner_rating integer;
  loser_rating integer;
  gain integer;
  loss integer;
  rated_today integer;
begin
  if game.status = 'disputed' then
    update public.coaches set dispute_score = dispute_score + 1 where id in (game.host, game.guest);

    if not game.ranked then
      delete from public.duel_boards where duel_id = game.id;
    end if;

    return;
  end if;

  if game.status = 'finished' then
    perform public.record_ghost_runs(game);
  end if;

  delete from public.duel_boards where duel_id = game.id;

  if game.status <> 'finished' then
    return;
  end if;

  -- The dispute an arbitrated duel went through already counted; the arbiter clears the honest coach.
  if game.ended_by <> 'arbiter' then
    update public.coaches set dispute_score = dispute_score * 0.8 where id in (game.host, game.guest);
  end if;

  if game.winner is null or not game.ranked then
    return;
  end if;

  select count(*)
  into rated_today
  from public.duels d
  where d.ranked
    and d.status = 'finished'
    and d.winner is not null
    and d.id <> game.id
    and least(d.host, d.guest) = least(game.host, game.guest)
    and greatest(d.host, d.guest) = greatest(game.host, game.guest)
    and d.finished_at > now() - interval '1 day';

  if rated_today >= 3 then
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

  gain := case when early then 0 else public.elo_change(winner_rating, loser_rating, true) end;
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

-- Rating ---------------------------------------------------------------------------------------------------------

-- Moves the coach's rating for a ghost duel by `winning_side` (-1 a draw): half of what a live duel would move.
-- Returns the change.
create function public.rate_ghost_duel(game public.ghost_duels, winning_side smallint)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  mine integer;
  change integer;
begin
  if winning_side = -1 then
    return 0;
  end if;

  insert into public.ratings (coach_id, mode) values (game.coach_id, game.mode) on conflict (coach_id, mode) do nothing;

  select rating into mine from public.ratings where coach_id = game.coach_id and mode = game.mode for update;

  change := round(public.elo_change(mine, game.ghost_rating, winning_side = 0) / 2.0)::integer;
  change := greatest(change, -mine);

  update public.ratings
  set rating = rating + change, peak = greatest(peak, rating + change)
  where coach_id = game.coach_id and mode = game.mode;

  update public.coaches c
  set rating = (select coalesce(max(r.rating), 0) from public.ratings r where r.coach_id = c.id), updated_at = now()
  where c.id = game.coach_id;

  return change;
end;
$$;

-- Ends an active ghost duel with this result and rates it.
create function public.finish_ghost_duel(game public.ghost_duels, winning_side smallint, how text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  before_rating integer;
  before_peak integer;
  change integer;
begin
  insert into public.ratings (coach_id, mode) values (game.coach_id, game.mode) on conflict (coach_id, mode) do nothing;
  select rating, peak into before_rating, before_peak
  from public.ratings where coach_id = game.coach_id and mode = game.mode for update;
  change := public.rate_ghost_duel(game, winning_side);

  update public.ghost_duels
  set
    status = 'finished',
    result = winning_side,
    ended_by = how,
    finished_at = now(),
    rating_change = change,
    rating_before = before_rating,
    peak_before = before_peak
  where id = game.id;
end;
$$;

-- What the coach calls ---------------------------------------------------------------------------------------------

-- Takes the caller out of the queue and into a duel against the ghost nearest their rating in the mode. Returns
-- null while a live rival was just found (the queue goes on) or when there is no ghost to fight.
create function public.find_ghost(game_mode text, game_balance text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := (public.ensure_coach()).id;
  mine integer;
  run public.ghost_runs;
  game public.ghost_duels;
begin
  if game_mode is null or game_mode not in ('threeLanes', 'twoLanes', 'oneLane') then
    raise exception 'Unknown game mode' using errcode = '22023';
  end if;

  if game_balance is null or char_length(game_balance) not between 1 and 32 then
    raise exception 'Unknown battle rules' using errcode = '22023';
  end if;

  if public.has_sanction(me, 'ranked') then
    raise exception 'Ranked is closed for this coach for now' using errcode = 'P0403';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('match_queue', 2));

  perform public.lock_coaches(me, me);

  -- A lost response recovers the existing match without making another one.
  select * into game from public.ghost_duels g where g.coach_id = me and g.status = 'active';
  if found then
    return public.ghost_summary(game);
  end if;

  if public.found_duel(me) is not null or public.in_active_duel(me) then
    return null;
  end if;

  if not exists (
    select 1 from public.match_queue q
    where q.coach_id = me and q.mode = game_mode and q.balance = game_balance
      and q.joined_at <= now() - interval '45 seconds' and q.seen_at >= now() - interval '30 seconds'
  ) then
    return null;
  end if;

  mine := coalesce((select r.rating from public.ratings r where r.coach_id = me and r.mode = game_mode), 0);

  -- Nearby ratings, excluding the caller and blocked coaches.
  select g.* into run
  from public.ghost_runs g
  where g.mode = game_mode
    and g.balance = game_balance
    and g.verified
    and g.coach_id is distinct from me
    and (g.coach_id is null or not public.is_blocked(me, g.coach_id))
  order by abs(g.rating - mine) + (pg_catalog.random() * 60)
  limit 1;

  if not found then
    return null;
  end if;

  delete from public.match_queue where coach_id = me;

  insert into public.ghost_duels (coach_id, mode, balance, seed, ghost_rating, ghost_boards)
  values (me, game_mode, game_balance, gen_random_uuid()::text, run.rating, run.boards)
  returning * into game;

  return public.ghost_summary(game);
end;
$$;

-- The caller's ghost duel still under way, to pick up after a reload; null without one.
create function public.active_ghost()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.ghost_summary(g)
  from public.ghost_duels g
  where g.coach_id = auth.uid() and g.status = 'active'
$$;

-- Sends the caller's board for the round and returns the ghost's. Sending the last round again returns the same
-- ghost board, for a device that lost the answer. Past the recording, return its last board as an anchor;
-- the client and arbiter independently continue the squad with the same deterministic coach strategy.
create function public.ghost_round(ghost uuid, board_round integer, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.ghost_duels;
  runs integer;
begin
  select * into game from public.ghost_duels where id = ghost and coach_id = auth.uid() for update;

  if not found then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status <> 'active' then
    raise exception 'The duel is over' using errcode = 'P0410';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' or pg_column_size(payload) > 32768 then
    raise exception 'Unknown board' using errcode = '22023';
  end if;

  runs := jsonb_array_length(game.ghost_boards);

  if board_round is null or board_round < 1 then
    raise exception 'Wrong round' using errcode = 'P0409';
  end if;

  if board_round = game.round - 1 then
    if payload is distinct from game.boards -> (board_round - 1) then
      raise exception 'Board already committed' using errcode = 'P0409';
    end if;

    return game.ghost_boards -> (least(board_round, runs) - 1);
  end if;

  if board_round <> game.round or board_round > 40 then
    raise exception 'Wrong round' using errcode = 'P0409';
  end if;

  update public.ghost_duels
  set boards = boards || jsonb_build_array(payload), round = round + 1
  where id = ghost;

  return game.ghost_boards -> (least(board_round, runs) - 1);
end;
$$;

-- Reports how the caller's ghost duel ended, from their side: 0 they won, 1 the ghost did, -1 a draw. Giving up is
-- reporting 1. The first report is final; the arbiter checks it afterwards.
create function public.report_ghost(ghost uuid, winning_side smallint)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.ghost_duels;
begin
  if winning_side is null or winning_side not in (-1, 0, 1) then
    raise exception 'Unknown result' using errcode = '22023';
  end if;

  select * into game from public.ghost_duels where id = ghost and coach_id = auth.uid() for update;

  if not found then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status = 'active' then
    perform public.finish_ghost_duel(game, winning_side, 'result');
  end if;

  return (select g.rating_change from public.ghost_duels g where g.id = ghost);
end;
$$;

-- Giving up is an honest loss, rather than a match result requiring a complete replay.
create function public.forfeit_ghost(ghost uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  game public.ghost_duels;
begin
  select * into game from public.ghost_duels where id = ghost and coach_id = auth.uid() for update;
  if not found then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status = 'active' then
    perform public.finish_ghost_duel(game, 1::smallint, 'forfeit');
  end if;
end;
$$;

-- Human recordings are checked as a full original duel before they enter the selectable pool.
create function public.ghost_recording_queue(max_duels integer default 20)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.source_duel, 'mode', g.mode, 'balance', g.balance, 'seed', g.source_seed,
    'finishedAt', g.created_at,
    'boards', (select jsonb_agg(jsonb_build_object('round', b.round, 'side', r.source_side, 'board', b.board) order by b.round, r.source_side)
      from public.ghost_runs r cross join lateral jsonb_array_elements(r.boards) with ordinality as b(board, round)
      where r.source_duel = g.source_duel)
  )), '[]'::jsonb)
  from (
    select source_duel, mode, balance, source_seed, min(created_at) as created_at
    from public.ghost_runs where not verified and source_duel is not null
    group by source_duel, mode, balance, source_seed having count(*) = 2
    order by min(created_at) limit greatest(1, least(coalesce(max_duels, 20), 50))
  ) g
$$;

create function public.verify_ghost_recording(duel uuid, valid boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if valid then
    update public.ghost_runs set verified = true where source_duel = duel;
  else
    delete from public.ghost_runs where source_duel = duel and not verified;
  end if;
end;
$$;

-- Arbiter ----------------------------------------------------------------------------------------------------------

create function public.ghost_arbitration_queue(max_duels integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'mode', g.mode,
        'seed', g.seed,
        'balance', g.balance,
        'finishedAt', g.finished_at,
        'result', g.result,
        'boards', g.boards,
        'ghostBoards', g.ghost_boards
      )
      order by g.finished_at
    ),
    '[]'::jsonb
  )
  from (
    select *
    from public.ghost_duels
    where status = 'finished' and verified_at is null and ended_by = 'result'
    order by finished_at
    limit greatest(1, least(coalesce(max_duels, 20), 50))
  ) g
$$;

-- Confirms a ghost duel by its replay, or turns the result round when the replay shows another: the rating moves
-- back and then as it should have, and the report counts as false. Null leaves it uncounted.
create function public.verify_ghost(ghost uuid, winning_side smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.ghost_duels;
  falsehoods integer;
begin
  if winning_side is not null and winning_side not in (-1, 0, 1) then
    raise exception 'Unknown result' using errcode = '22023';
  end if;

  select * into game from public.ghost_duels where id = ghost for update;

  if not found or game.status <> 'finished' or game.verified_at is not null then
    return;
  end if;

  if winning_side is null then
    update public.ratings
    set rating = greatest(0, rating - coalesce(game.rating_change, 0)),
        peak = case when peak = greatest(game.peak_before, game.rating_before + coalesce(game.rating_change, 0))
          then greatest(game.peak_before, rating - coalesce(game.rating_change, 0)) else peak end
    where coach_id = game.coach_id and mode = game.mode;
    update public.coaches c
    set rating = (select coalesce(max(r.rating), 0) from public.ratings r where r.coach_id = c.id), updated_at = now()
    where c.id = game.coach_id;
    update public.ghost_duels set verified_at = now(), result = -1, rating_change = 0 where id = ghost;

    return;
  end if;

  if winning_side = game.result then
    update public.ghost_duels set verified_at = now() where id = ghost;

    return;
  end if;

  update public.ratings
  set rating = greatest(0, rating - coalesce(game.rating_change, 0)),
      peak = case when peak = greatest(game.peak_before, game.rating_before + coalesce(game.rating_change, 0))
        then greatest(game.peak_before, rating - coalesce(game.rating_change, 0)) else peak end
  where coach_id = game.coach_id and mode = game.mode;

  update public.ghost_duels
  set
    result = winning_side,
    ended_by = 'arbiter',
    false_report = true,
    verified_at = now(),
    rating_change = public.rate_ghost_duel(game, winning_side)
  where id = ghost;

  select
    (select count(*) from public.duels d where game.coach_id = any (d.false_reporters) and d.arbitrated_at > now() - interval '30 days')
    + (select count(*) from public.ghost_duels g where g.coach_id = game.coach_id and g.false_report and g.finished_at > now() - interval '30 days')
  into falsehoods;

  if falsehoods >= 2 and not public.has_sanction(game.coach_id, 'ranked') then
    perform public.apply_sanction(game.coach_id, 'ranked', now() + interval '14 days', true, 'False ghost duel results shown by replay');
  end if;
end;
$$;

-- Runs the computer played, uploaded by `scripts/seedGhosts.ts` to fill the pool before live runs come in.
create function public.add_ghost_runs(runs jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  added integer;
begin
  insert into public.ghost_runs (coach_id, mode, balance, rating, boards, verified)
  select null, r ->> 'mode', r ->> 'balance', (r ->> 'rating')::integer, r -> 'boards', true
  from jsonb_array_elements(runs) as r;

  get diagnostics added = row_count;

  return added;
end;
$$;

-- Housekeeping -----------------------------------------------------------------------------------------------------

-- A ghost duel left for two hours counts as lost, so leaving a lost one is no way out.
create function public.settle_stale_ghosts()
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.ghost_duels;
begin
  for game in
    select *
    from public.ghost_duels
    where status = 'active' and started_at < now() - interval '2 hours'
    for update skip locked
  loop
    perform public.finish_ghost_duel(game, 1::smallint, 'abandoned');
  end loop;

  -- The pool keeps the latest 300 runs of each mode and battle rules.
  delete from public.ghost_runs g
  using (
    select id, row_number() over (partition by mode, balance order by created_at desc) as place
    from public.ghost_runs
  ) ranked
  where g.id = ranked.id and ranked.place > 300;

  delete from public.ghost_duels where finished_at < now() - interval '30 days';
end;
$$;

-- False results in live and recorded duels share one ranked limit, regardless of their order.
create or replace function public.arbitrate_duel(duel uuid, winning_side smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
  liars uuid[];
  liar uuid;
begin
  if winning_side is not null and winning_side not in (-1, 0, 1) then
    raise exception 'Unknown result' using errcode = '22023';
  end if;

  select * into game from public.duels where id = duel for update;

  if not found or not game.ranked or game.status <> 'disputed' or game.arbitrated_at is not null then
    return;
  end if;

  if winning_side is null then
    update public.duels set arbitrated_at = now() where id = duel;
    delete from public.duel_boards where duel_id = duel;

    return;
  end if;

  perform public.lock_coaches(game.host, game.guest);

  liars := array_remove(
    array[
      case when game.host_result is distinct from winning_side then game.host end,
      case when game.guest_result is distinct from winning_side then game.guest end
    ],
    null
  );

  update public.duels
  set
    status = 'finished',
    winner = case winning_side when 0 then host when 1 then guest end,
    ended_by = 'arbiter',
    arbitrated_at = now(),
    false_reporters = liars
  where id = duel
  returning * into game;

  -- The dispute counted against both coaches; the one who told the truth gets theirs back.
  update public.coaches
  set dispute_score = greatest(0, dispute_score - 1)
  where id in (game.host, game.guest) and not (id = any (liars));

  perform public.settle_duel(game);

  foreach liar in array liars loop
    if not public.has_sanction(liar, 'ranked')
      and (
        select count(*)
        from public.duels d
        where liar = any (d.false_reporters) and d.arbitrated_at > now() - interval '30 days'
      ) + (
        select count(*)
        from public.ghost_duels g
        where g.coach_id = liar and g.false_report and g.finished_at > now() - interval '30 days'
      ) >= 2
    then
      perform public.apply_sanction(liar, 'ranked', now() + interval '14 days', true, 'False duel results shown by replay');
    end if;
  end loop;
end;
$$;

-- Privileges -------------------------------------------------------------------------------------------------------

revoke execute on function
  public.ghost_recording_queue(integer),
  public.verify_ghost_recording(uuid, boolean),
  public.ghost_summary(public.ghost_duels),
  public.record_ghost_runs(public.duels),
  public.settle_duel(public.duels),
  public.rate_ghost_duel(public.ghost_duels, smallint),
  public.finish_ghost_duel(public.ghost_duels, smallint, text),
  public.settle_stale_ghosts(),
  public.ghost_arbitration_queue(integer),
  public.verify_ghost(uuid, smallint),
  public.add_ghost_runs(jsonb)
from public, anon, authenticated;

grant execute on function
  public.ghost_arbitration_queue(integer),
  public.verify_ghost(uuid, smallint),
  public.add_ghost_runs(jsonb)
to service_role;

grant execute on function public.ghost_recording_queue(integer), public.verify_ghost_recording(uuid, boolean) to service_role;

revoke execute on function
  public.find_ghost(text, text),
  public.active_ghost(),
  public.ghost_duel(uuid),
  public.forfeit_ghost(uuid),
  public.ghost_round(uuid, integer, jsonb),
  public.report_ghost(uuid, smallint)
from public, anon;

grant execute on function
  public.find_ghost(text, text),
  public.active_ghost(),
  public.ghost_duel(uuid),
  public.forfeit_ghost(uuid),
  public.ghost_round(uuid, integer, jsonb),
  public.report_ghost(uuid, smallint)
to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    perform cron.schedule('settle-stale-ghosts', '*/10 * * * *', 'select public.settle_stale_ghosts()');
  else
    raise notice 'pg_cron is not available: schedule public.settle_stale_ghosts()';
  end if;
end;
$$;
