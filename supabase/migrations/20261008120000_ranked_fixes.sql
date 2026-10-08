-- Ranked fixes after 10.0.
-- 1. A ghost duel the arbiter cannot replay, because it was played under rules its code no longer has, keeps its
--    result. Only a ghost recording that turns out to be broken still leaves the duel uncounted.
-- 2. A coach never meets the same recording twice in 30 days, and only the first ten ghost duels of a day move
--    their rating, so a small pool cannot be learnt and farmed.
-- 3. A ghost duel can be reported as won or drawn only after three rounds: an instant claim waits for nothing.
-- 4. The daily limit between two coaches counts the duels that really moved their ratings.
-- Duels and ghosts now carry the fingerprint of the whole match's rules (`MATCH_RULES_FINGERPRINT`), not only of
-- the fights: the column keeps its name and size.

alter table public.duels add column rated boolean not null default false;

-- Duels settled before this migration that moved ratings: decided ranked duels.
update public.duels set rated = true where ranked and status = 'finished' and winner is not null;

alter table public.ghost_duels add column run_id bigint references public.ghost_runs (id) on delete set null;

create index ghost_duels_runs_seen on public.ghost_duels (coach_id, run_id) where run_id is not null;

-- Ghost duels a coach may have rated in a day.
create function public.ghost_daily_rated()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 10
$$;

-- Rounds a ghost duel must last before it can be reported as won or drawn.
create function public.ghost_min_rounds()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 3
$$;

drop function public.verify_ghost(uuid, smallint);

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
    and d.rated
    and d.id <> game.id
    and least(d.host, d.guest) = least(game.host, game.guest)
    and greatest(d.host, d.guest) = greatest(game.host, game.guest)
    and d.finished_at > now() - interval '1 day';

  if rated_today >= 3 then
    return;
  end if;

  loser := case when game.winner = game.host then game.guest else game.host end;

  update public.duels set rated = true where id = game.id;

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

create or replace function public.finish_ghost_duel(game public.ghost_duels, winning_side smallint, how text)
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
  change := case
    when (
      select count(*)
      from public.ghost_duels g
      where g.coach_id = game.coach_id
        and g.id <> game.id
        and g.rating_change <> 0
        and g.finished_at > now() - interval '1 day'
    ) >= public.ghost_daily_rated()
      then 0
    else public.rate_ghost_duel(game, winning_side)
  end;

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

create or replace function public.find_ghost(game_mode text, game_balance text)
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
    and not exists (
      select 1
      from public.ghost_duels d
      where d.coach_id = me and d.run_id = g.id and d.started_at > now() - interval '30 days'
    )
    and (g.coach_id is null or not public.is_blocked(me, g.coach_id))
  order by abs(g.rating - mine) + (pg_catalog.random() * 60)
  limit 1;

  if not found then
    return null;
  end if;

  delete from public.match_queue where coach_id = me;

  insert into public.ghost_duels (coach_id, run_id, mode, balance, seed, ghost_rating, ghost_boards)
  values (me, run.id, game_mode, game_balance, gen_random_uuid()::text, run.rating, run.boards)
  returning * into game;

  return public.ghost_summary(game);
end;
$$;

create or replace function public.report_ghost(ghost uuid, winning_side smallint)
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

  if game.status = 'active' and winning_side <> 1 and game.round - 1 < public.ghost_min_rounds() then
    raise exception 'The match has not gone on long enough' using errcode = 'P0425';
  end if;

  if game.status = 'active' then
    perform public.finish_ghost_duel(game, winning_side, 'result');
  end if;

  return (select g.rating_change from public.ghost_duels g where g.id = ghost);
end;
$$;

create function public.verify_ghost(ghost uuid, winning_side smallint, neutralize boolean default false)
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

  if winning_side is null and not coalesce(neutralize, false) then
    update public.ghost_duels set verified_at = now() where id = ghost;

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


revoke execute on function
  public.ghost_daily_rated(),
  public.ghost_min_rounds(),
  public.settle_duel(public.duels),
  public.finish_ghost_duel(public.ghost_duels, smallint, text),
  public.verify_ghost(uuid, smallint, boolean)
from public, anon, authenticated;

grant execute on function public.verify_ghost(uuid, smallint, boolean) to service_role;

revoke execute on function
  public.find_ghost(text, text),
  public.report_ghost(uuid, smallint)
from public, anon;

grant execute on function
  public.find_ghost(text, text),
  public.report_ghost(uuid, smallint)
to authenticated;
