-- Ranked integrity.
-- 1. A disputed ranked duel is decided by replaying it. Every board of a ranked duel now stays until the duel is
--    settled, and those of a disputed one until the arbiter (`scripts/arbiter.ts`) has replayed it under the battle
--    rules the duel was played with. The replay settles the rating as the duel was really played; a coach whose
--    report it contradicts is remembered, and two such reports in 30 days close ranked for them for 14 days.
-- 2. A ranked duel given up or abandoned within its first three rounds still costs the loser, but pays the winner
--    nothing: a second account cannot hand out free wins.
-- 3. The same two coaches move each other's rating in at most three ranked duels a day.
-- 4. Reports of abuse in chat bring an automatic mute closer only when the reported coach wrote to the reporter.

-- The battle rules a ranked duel is played under, from the queue both coaches joined.
alter table public.duels add column balance text check (balance is null or char_length(balance) between 1 and 32);

-- When the arbiter replayed a disputed duel, and whose reports the replay contradicted.
alter table public.duels add column arbitrated_at timestamptz;
alter table public.duels add column false_reporters uuid[] not null default '{}';

alter table public.duels drop constraint if exists duels_ended_by_check;

alter table public.duels add constraint duels_ended_by_check
  check (ended_by in ('result', 'forfeit', 'timeout', 'arbiter'));

create index duels_awaiting_arbiter on public.duels (finished_at)
where ranked and status = 'disputed' and arbitrated_at is null;

create index duels_false_reporters on public.duels using gin (false_reporters)
where cardinality(false_reporters) > 0;

-- A coach may be kept out of ranked for a while.
alter table public.sanctions drop constraint if exists sanctions_kind_check;

alter table public.sanctions add constraint sanctions_kind_check
  check (kind in ('chat', 'name', 'leaderboard', 'reports', 'ranked'));

-- Settling ----------------------------------------------------------------------------------------------------------

-- Ratings move by Elo, except that a ranked duel ended early by giving up or going quiet pays the winner nothing,
-- and the same two coaches move each other's rating in at most three ranked duels a day. A ranked dispute keeps its
-- boards for the arbiter.
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

-- Boards ------------------------------------------------------------------------------------------------------------

-- As before, but a ranked duel keeps every round's boards until it is settled, so a dispute can be replayed.
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

    if not game.ranked then
      delete from public.duel_boards where duel_id = duel and round < board_round;
    end if;
  end if;

  return theirs;
end;
$$;

-- Matchmaking -------------------------------------------------------------------------------------------------------

-- As before, but the duel remembers the battle rules both coaches queued with, and coaches kept out of ranked can
-- neither queue nor be found.
create or replace function public.find_match(game_mode text, game_balance text)
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

  if public.has_sanction(me, 'ranked') then
    raise exception 'Ranked is closed for this coach for now' using errcode = 'P0403';
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
    and not public.has_sanction(q.coach_id, 'ranked')
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

  insert into public.duels (host, guest, mode, ranked, balance, status, seed, started_at, round_opened_at)
  values (rival.coach_id, me, mine.mode, true, mine.balance, 'active', gen_random_uuid()::text, now(), now())
  returning id into found_id;

  return found_id;
end;
$$;

-- Arbitration -------------------------------------------------------------------------------------------------------

-- Disputed ranked duels the arbiter has not replayed yet, oldest first, with every board both sides sent.
create function public.arbitration_queue(max_duels integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'mode', d.mode,
        'seed', d.seed,
        'balance', d.balance,
        'finishedAt', d.finished_at,
        'boards', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object('round', b.round, 'side', b.side, 'board', b.board)
              order by b.round, b.side
            )
            from public.duel_boards b
            where b.duel_id = d.id
          ),
          '[]'::jsonb
        )
      )
      order by d.finished_at
    ),
    '[]'::jsonb
  )
  from (
    select *
    from public.duels
    where ranked and status = 'disputed' and arbitrated_at is null
    order by finished_at
    limit greatest(1, least(coalesce(max_duels, 20), 50))
  ) d
$$;

-- Settles a disputed ranked duel by its replay: `winning_side` is the side that won, -1 for a draw, or null when the
-- replay could not decide, which leaves the duel uncounted as before.
create function public.arbitrate_duel(duel uuid, winning_side smallint)
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
      ) >= 2
    then
      perform public.apply_sanction(liar, 'ranked', now() + interval '14 days', true, 'False duel results shown by replay');
    end if;
  end loop;
end;
$$;

-- Boards of finished duels go, except those of ranked disputes still waiting for the arbiter, for up to a week.
create or replace function public.cleanup_old_data()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.duel_boards b
  using public.duels d
  where d.id = b.duel_id
    and d.status <> 'active'
    and not (
      d.ranked and d.status = 'disputed' and d.arbitrated_at is null and d.finished_at > now() - interval '7 days'
    );

  delete from public.duels
  where (status in ('declined', 'cancelled', 'expired') and created_at < now() - interval '1 day')
    or (status in ('finished', 'disputed', 'abandoned') and finished_at < now() - interval '30 days');

  delete from public.match_queue where seen_at < now() - interval '1 minute';
  delete from public.live_matches where updated_at < now() - interval '10 minutes';
  delete from public.friend_declines where declined_at < now() - interval '7 days';

  -- Receipts only stop a match from being counted twice, and a match is accepted for five minutes after it ends.
  delete from public.telemetry_receipts where created_at < now() - interval '2 days';

  delete from public.matches where played_at < now() - interval '90 days';

  -- Account profiles are durable progress, including guests. Account deletion needs a separate policy.
  if to_regclass('cron.job_run_details') is not null then
    execute 'delete from cron.job_run_details where end_time < now() - interval ''7 days''';
  end if;
end;
$$;

-- Reports ---------------------------------------------------------------------------------------------------------

-- As before, but abuse reports count towards an automatic mute only from coaches the reported coach wrote to.
create or replace function public.report_player(report_id uuid, player uuid, reason text, details text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  proof jsonb;
  -- Abuse in chat mutes the chat; an offensive name or picture hides both. Other reasons wait for a moderator.
  sanction text := case report_player.reason when 'abuse' then 'chat' when 'name' then 'name' end;
  votes integer;
begin
  if caller is null or not exists (select 1 from auth.users u where u.id = caller and u.is_anonymous is false) then
    raise exception 'Sign in to report a player' using errcode = '42501';
  end if;

  if player = caller or not exists (select 1 from public.coaches c where c.id = player) then
    raise exception 'Unknown player' using errcode = '22023';
  end if;

  if public.has_sanction(caller, 'reports') then
    raise exception 'reports_restricted' using errcode = 'P0403';
  end if;

  -- Per-player serialization makes quota checks and retries safe under concurrent submissions.
  perform pg_advisory_xact_lock(hashtextextended(caller::text || ':report', 0));

  if exists (select 1 from public.player_reports r where r.id = report_id and r.reporter = caller) then
    return;
  end if;

  if (select count(*) from public.player_reports r
      where r.reporter = caller and r.created_at >= now() - interval '1 hour') >= 5
    or (select count(*) from public.player_reports r
      where r.reporter = caller and r.created_at >= now() - interval '1 day') >= 20
  then
    raise exception 'report_rate_limit' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'name', c.name,
    'photo', c.photo,
    'chat', coalesce((
      select jsonb_agg(jsonb_build_object(
        'from', case when m.sender = player then 'reported' else 'reporter' end,
        'body', m.body,
        'at', m.created_at
      ) order by m.id)
      from (
        select k.id, k.sender, k.body, k.created_at
        from public.messages k
        where (k.sender = caller and k.recipient = player) or (k.sender = player and k.recipient = caller)
        order by k.id desc
        limit 30
      ) m
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id,
        'at', x.played_at,
        'verdict', x.verdict,
        'mode', x.data ->> 'mode'
      ) order by x.played_at desc)
      from (
        select k.id, k.played_at, k.verdict, k.data
        from public.matches k
        where k.user_id = player
        order by k.played_at desc
        limit 5
      ) x
    ), '[]'::jsonb),
    'ratings', coalesce((
      select jsonb_object_agg(r.mode, r.rating) from public.ratings r where r.coach_id = player
    ), '{}'::jsonb),
    'reporter', jsonb_build_object(
      'since', (select u.created_at from auth.users u where u.id = caller),
      'sent', (select count(*) from public.player_reports r
        where r.reporter = caller and r.created_at >= now() - interval '90 days'),
      'rejected', (select count(*) from public.player_reports r
        where r.reporter = caller and r.status = 'rejected' and r.resolved_at >= now() - interval '90 days'),
      'trusted', public.trusted_reporter(caller)
    )
  )
  into proof
  from public.coaches c
  where c.id = player;

  insert into public.player_reports (id, reporter, reported, reason, details, evidence)
  values (report_id, caller, player, reason, left(btrim(coalesce(details, '')), 500), proof);

  if sanction is null or public.has_sanction(player, sanction) then
    return;
  end if;

  select count(distinct r.reporter)
  into votes
  from public.player_reports r
  where r.reported = player
    and r.reason = report_player.reason
    and r.status = 'new'
    and r.created_at >= now() - interval '7 days'
    and public.trusted_reporter(r.reporter)
    -- Abuse is judged by what the coach wrote: only coaches they wrote to bring a mute closer.
    and (
      r.reason <> 'abuse'
      or jsonb_path_exists(r.evidence, '$.chat[*] ? (@.from == "reported")')
    );

  if votes >= 3 then
    perform public.apply_sanction(
      player,
      sanction,
      now() + case sanction when 'chat' then interval '3 days' else interval '7 days' end,
      true,
      format('%s trusted reports in a week', votes)
    );

    update public.player_reports
    set evidence = evidence || jsonb_build_object('auto', sanction)
    where id = report_id;
  end if;
end;
$$;

-- Privileges --------------------------------------------------------------------------------------------------------

revoke execute on function
  public.settle_duel(public.duels),
  public.cleanup_old_data(),
  public.arbitration_queue(integer),
  public.arbitrate_duel(uuid, smallint)
from public, anon, authenticated;

-- Only the arbiter, with the service key, reads disputed boards and settles disputes.
grant execute on function
  public.arbitration_queue(integer),
  public.arbitrate_duel(uuid, smallint)
to service_role;

revoke execute on function
  public.submit_board(uuid, integer, jsonb),
  public.find_match(text, text)
from public, anon;

grant execute on function
  public.submit_board(uuid, integer, jsonb),
  public.find_match(text, text)
to authenticated;

revoke execute on function public.report_player(uuid, uuid, text, text) from public, anon;
grant execute on function public.report_player(uuid, uuid, text, text) to authenticated;
