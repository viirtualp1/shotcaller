-- Ghost duels: ranked duels leave their boards as ghost runs, a waiting coach fights the nearest one round by round
-- for half the rating, and the arbiter's replay can turn a false result round.
-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;

insert into auth.users(id, is_anonymous) values
  ('95000000-0000-4000-8000-000000000001', false),
  ('95000000-0000-4000-8000-000000000002', false),
  ('95000000-0000-4000-8000-000000000003', false);
insert into public.coaches(id, friend_code, name) values
  ('95000000-0000-4000-8000-000000000001', 'AAAA9595', 'Host'),
  ('95000000-0000-4000-8000-000000000002', 'BBBB9595', 'Guest'),
  ('95000000-0000-4000-8000-000000000003', 'CCCC9595', 'Waiter');

create temp table ids(name text primary key, id uuid);
grant all on ids to authenticated;

create function pg_temp.act_as(coach uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coach::text, true), set_config('request.jwt.claims', '{"is_anonymous":false}', true)
$$;

create function pg_temp.rating(coach uuid) returns integer language sql as $$
  select coalesce((select rating from public.ratings where coach_id = coach and mode = 'oneLane'), 0)
$$;

-- A ranked duel of three rounds, played out: both sides become ghost runs.
do $$
declare
  game public.duels;
begin
  insert into public.duels (host, guest, mode, ranked, balance, status, seed, started_at, round_opened_at)
  values (
    '95000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000002', 'oneLane', true, 'abc',
    'active', 'seed', now(), now()
  )
  returning * into game;

  insert into public.duel_boards (duel_id, round, side, board)
  select game.id, r, s, jsonb_build_object('round', r, 'side', s)
  from generate_series(1, 3) as r, generate_series(0, 1) as s;

  update public.duels
  set status = 'finished', winner = host, ended_by = 'result', finished_at = now()
  where id = game.id
  returning * into game;

  perform public.settle_duel(game);
end;
$$;

do $$
begin
  if (select count(*) from public.ghost_runs where mode = 'oneLane' and balance = 'abc') <> 2
    or (select boards -> 2 ->> 'round' from public.ghost_runs where coach_id = '95000000-0000-4000-8000-000000000001') <> '3'
  then
    raise exception 'A played-out ranked duel did not leave both sides as ghost runs';
  end if;
end;
$$;

-- Player recordings await the arbiter; only a complete legal replay admits them to the pool.
do $$
begin
  if exists (select 1 from public.ghost_runs where verified) or jsonb_array_length(public.ghost_recording_queue(10)) <> 1 then
    raise exception 'Unverified player recordings entered the pool';
  end if;
end;
$$;
select public.verify_ghost_recording((select source_duel from public.ghost_runs limit 1), true);

-- A waiting coach finds a ghost under the same battle rules only.
select pg_temp.act_as('95000000-0000-4000-8000-000000000003');
set local role authenticated;

do $$
begin
  if public.find_ghost('oneLane', 'other') is not null then
    raise exception 'A ghost of other battle rules was offered';
  end if;
end;
$$;

-- No queue and a fresh queue must both refuse the fallback.
do $$
begin
  if public.find_ghost('oneLane', 'abc') is not null then
    raise exception 'Ghost started without waiting in a queue';
  end if;
  perform public.find_match('oneLane', 'abc');
  if public.find_ghost('oneLane', 'abc') is not null then
    raise exception 'Ghost started before 45 seconds';
  end if;
end;
$$;
reset role;
update public.match_queue set joined_at = now() - interval '46 seconds' where coach_id = '95000000-0000-4000-8000-000000000003';
set local role authenticated;

insert into ids select 'ghost', (public.find_ghost('oneLane', 'abc') ->> 'id')::uuid;

do $$
begin
  if (select id from ids where name = 'ghost') is null or (public.active_ghost() ->> 'id')::uuid <> (select id from ids where name = 'ghost') then
    raise exception 'No ghost duel started';
  end if;

  if (public.find_ghost('oneLane', 'abc') ->> 'id')::uuid <> (select id from ids where name = 'ghost') then
    raise exception 'A retry did not recover the existing ghost';
  end if;
  if public.ghost_duel((select id from ids where name = 'ghost')) ? 'ghost_boards' then
    raise exception 'Ghost metadata exposed future boards';
  end if;
  begin
    perform public.find_match('oneLane', 'abc');
    raise exception 'Live matchmaking accepted a coach playing a ghost';
  exception when sqlstate 'P0409' then
    null;
  end;
end;
$$;

-- The ghost's board comes only for the round the coach sends theirs, and again on a retry.
do $$
declare
  ghost constant uuid := (select id from ids where name = 'ghost');
  answer jsonb;
begin
  answer := public.ghost_round(ghost, 1, '{"mine":1}');
  if answer ->> 'round' <> '1' or public.ghost_round(ghost, 1, '{"mine":1}') ->> 'round' <> '1' then
    raise exception 'The ghost answered round 1 with %', answer;
  end if;

  begin
    perform public.ghost_round(ghost, 3, '{"mine":3}');
    raise exception 'A board for a later round showed the ghost''s ahead of time';
  exception when sqlstate 'P0409' then
    null;
  end;

  begin
    perform public.ghost_round(ghost, 1, '{"mine":999}');
    raise exception 'A committed board was replaceable after seeing the ghost';
  exception when sqlstate 'P0409' then
    null;
  end;
  begin
    perform public.ghost_round(ghost, null, '{"mine":1}');
    raise exception 'A null round revealed a board';
  exception when sqlstate 'P0409' then
    null;
  end;

  perform public.ghost_round(ghost, 2, '{"mine":2}');
  perform public.ghost_round(ghost, 3, '{"mine":3}');

  -- Past the end of its run the ghost keeps its last board.
  if public.ghost_round(ghost, 4, '{"mine":4}') ->> 'round' <> '3' then
    raise exception 'The ghost ran out of boards';
  end if;
end;
$$;

-- A win moves the rating by half of a live duel's 25 between equals.
do $$
begin
  if public.report_ghost((select id from ids where name = 'ghost'), 0::smallint) <> 13 then
    raise exception 'A ghost win did not move the rating by 13';
  end if;
end;
$$;

-- Players cannot read the arbiter's queue.
do $$
begin
  perform public.ghost_arbitration_queue(10);
  raise exception 'A player read the ghost arbitration queue';
exception when insufficient_privilege then
  null;
end;
$$;

reset role;

do $$
begin
  if pg_temp.rating('95000000-0000-4000-8000-000000000003') <> 13 then
    raise exception 'A ghost win left the rating at %', pg_temp.rating('95000000-0000-4000-8000-000000000003');
  end if;
end;
$$;

-- The replay shows the ghost won: the rating moves back and then down, and the report counts as false.
do $$
declare
  queue jsonb := public.ghost_arbitration_queue(10);
begin
  if jsonb_array_length(queue) <> 1 or jsonb_array_length(queue -> 0 -> 'boards') <> 4 then
    raise exception 'The arbiter does not see the ghost duel: %', queue;
  end if;

  perform public.verify_ghost((select id from ids where name = 'ghost'), 1::smallint);

  if pg_temp.rating('95000000-0000-4000-8000-000000000003') <> 0
    or (select peak from public.ratings where coach_id = '95000000-0000-4000-8000-000000000003' and mode = 'oneLane') <> 0
    or not (select false_report from public.ghost_duels where id = (select id from ids where name = 'ghost'))
    or jsonb_array_length(public.ghost_arbitration_queue(10)) <> 0
  then
    raise exception 'The false ghost result was not turned round';
  end if;
end;
$$;

-- A ghost duel left for two hours counts as lost.
select pg_temp.act_as('95000000-0000-4000-8000-000000000003');
set local role authenticated;
select public.find_match('oneLane', 'abc');
reset role;
update public.match_queue set joined_at = now() - interval '46 seconds' where coach_id = '95000000-0000-4000-8000-000000000003';
set local role authenticated;
insert into ids select 'left', (public.find_ghost('oneLane', 'abc') ->> 'id')::uuid;
reset role;

update public.ghost_duels set started_at = now() - interval '3 hours' where id = (select id from ids where name = 'left');
select public.settle_stale_ghosts();

do $$
begin
  if (select (status, result, ended_by) from public.ghost_duels where id = (select id from ids where name = 'left'))
    is distinct from ('finished'::text, 1::smallint, 'abandoned'::text)
  then
    raise exception 'A ghost duel left alone was not counted as lost';
  end if;
end;
$$;

-- Ghost metadata and boards are private, including from other signed-in coaches.
select pg_temp.act_as('95000000-0000-4000-8000-000000000002');
set local role authenticated;
do $$
begin
  if public.ghost_duel((select id from ids where name = 'ghost')) is not null then
    raise exception 'Another coach read ghost metadata';
  end if;
  begin
    perform public.ghost_round((select id from ids where name = 'ghost'), 1, '{}');
    raise exception 'Another coach read a ghost board';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.forfeit_ghost((select id from ids where name = 'ghost'));
    raise exception 'Another coach forfeited a ghost';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- Explicit forfeits are idempotent losses, not false match-result reports.
select pg_temp.act_as('95000000-0000-4000-8000-000000000003');
set local role authenticated;
select public.find_match('oneLane', 'abc');
reset role;
update public.match_queue set joined_at = now() - interval '46 seconds' where coach_id = '95000000-0000-4000-8000-000000000003';
set local role authenticated;
insert into ids select 'forfeit', (public.find_ghost('oneLane', 'abc') ->> 'id')::uuid;
select public.forfeit_ghost((select id from ids where name = 'forfeit'));
select public.forfeit_ghost((select id from ids where name = 'forfeit'));
reset role;
do $$
begin
  if (select ended_by from public.ghost_duels where id = (select id from ids where name = 'forfeit')) <> 'forfeit'
    or jsonb_array_length(public.ghost_arbitration_queue(10)) <> 0 then
    raise exception 'An honest ghost forfeit was queued as a claimed match result';
  end if;
end;
$$;

-- A damaged or old-rule recording is uncounted, never an unchecked rating gain.
insert into public.ghost_duels (coach_id, mode, balance, seed, ghost_rating, ghost_boards)
select '95000000-0000-4000-8000-000000000003', 'oneLane', 'abc', 'neutral', 0, boards from public.ghost_runs limit 1;
insert into ids select 'neutral', id from public.ghost_duels where seed = 'neutral';
select pg_temp.act_as('95000000-0000-4000-8000-000000000003');
set local role authenticated;
select public.report_ghost((select id from ids where name = 'neutral'), 0::smallint);
reset role;
select public.verify_ghost((select id from ids where name = 'neutral'), null);
do $$
begin
  if pg_temp.rating('95000000-0000-4000-8000-000000000003') <> 0
    or (select peak from public.ratings where coach_id = '95000000-0000-4000-8000-000000000003' and mode = 'oneLane') <> 0 then
    raise exception 'An uncounted ghost left rating or peak inflated';
  end if;
end;
$$;

-- A false ghost result followed by a false live result closes ranked too.
insert into public.duels (host, guest, mode, ranked, status, host_result, guest_result, finished_at)
values (
  '95000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000003', 'oneLane', true,
  'disputed', 0, 1, now()
);
select public.arbitrate_duel(
  (select id from public.duels where status = 'disputed' and guest = '95000000-0000-4000-8000-000000000003'),
  0::smallint
);
do $$
begin
  if not public.has_sanction('95000000-0000-4000-8000-000000000003', 'ranked')
    or public.has_sanction('95000000-0000-4000-8000-000000000001', 'ranked') then
    raise exception 'False results in ghost and live duels did not share the ranked limit';
  end if;
end;
$$;

rollback;
