-- Ranked integrity: early wins pay nothing, a pair's ratings move at most three times a day, disputed ranked duels
-- keep their boards until the arbiter replays them, false reports close ranked, and abuse reports need a message.
-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;

insert into auth.users(id, is_anonymous, created_at) values
  ('94000000-0000-4000-8000-000000000001', false, now() - interval '30 days'),
  ('94000000-0000-4000-8000-000000000002', false, now() - interval '30 days'),
  ('94000000-0000-4000-8000-000000000003', false, now() - interval '30 days'),
  ('94000000-0000-4000-8000-000000000004', false, now() - interval '30 days'),
  ('94000000-0000-4000-8000-000000000005', false, now() - interval '30 days'),
  ('94000000-0000-4000-8000-000000000009', false, now() - interval '30 days');
insert into public.coaches(id, friend_code, name) values
  ('94000000-0000-4000-8000-000000000001', 'AAAA9494', 'Host'),
  ('94000000-0000-4000-8000-000000000002', 'BBBB9494', 'Guest'),
  ('94000000-0000-4000-8000-000000000003', 'CCCC9494', 'Third'),
  ('94000000-0000-4000-8000-000000000004', 'DDDD9494', 'Fourth'),
  ('94000000-0000-4000-8000-000000000005', 'EEEE9494', 'Fifth'),
  ('94000000-0000-4000-8000-000000000009', 'XXXX9494', 'Quiet');

create temp table ids(name text primary key, id uuid);
grant all on ids to authenticated;

create function pg_temp.act_as(coach uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coach::text, true), set_config('request.jwt.claims', '{"is_anonymous":false}', true)
$$;

create function pg_temp.ranked(host uuid, guest uuid, winner uuid, ended text, rounds integer)
returns void
language plpgsql
as $$
declare
  game public.duels;
begin
  insert into public.duels (host, guest, mode, ranked, status, winner, ended_by, round, finished_at)
  values (host, guest, 'oneLane', true, 'finished', winner, ended, rounds, now())
  returning * into game;

  perform public.settle_duel(game);
end;
$$;

create function pg_temp.rating(coach uuid) returns integer language sql as $$
  select coalesce((select rating from public.ratings where coach_id = coach and mode = 'oneLane'), 0)
$$;

-- Giving up in the first rounds costs the loser but pays the winner nothing.
update public.ratings set rating = 0;
insert into public.ratings (coach_id, mode, rating, peak) values
  ('94000000-0000-4000-8000-000000000002', 'oneLane', 100, 100);

select pg_temp.ranked(
  '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000001', 'forfeit', 2
);

do $$
begin
  if pg_temp.rating('94000000-0000-4000-8000-000000000001') <> 0
    or pg_temp.rating('94000000-0000-4000-8000-000000000002') >= 100
  then
    raise exception 'An early forfeit paid the winner or spared the loser';
  end if;
end;
$$;

-- A late forfeit pays as usual.
select pg_temp.ranked(
  '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000001', 'forfeit', 6
);

do $$
begin
  if pg_temp.rating('94000000-0000-4000-8000-000000000001') <= 0 then
    raise exception 'A forfeit after three rounds paid nothing';
  end if;
end;
$$;

-- The same pair moves ratings in at most three duels a day: two have counted, one more does, a fourth does not.
select pg_temp.ranked(
  '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000001', 'result', 12
);

create temp table before_cap as
select pg_temp.rating('94000000-0000-4000-8000-000000000001') as host,
  pg_temp.rating('94000000-0000-4000-8000-000000000002') as guest;

select pg_temp.ranked(
  '94000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000001', 'result', 12
);

do $$
begin
  if (select host from before_cap) <> pg_temp.rating('94000000-0000-4000-8000-000000000001')
    or (select guest from before_cap) <> pg_temp.rating('94000000-0000-4000-8000-000000000002')
  then
    raise exception 'A fourth duel between the same coaches in a day moved their ratings';
  end if;
end;
$$;

-- A ranked duel keeps every round's boards; a dispute keeps them for the arbiter.
insert into public.duels (host, guest, mode, ranked, balance, status, seed, started_at, round_opened_at)
values (
  '94000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000004', 'oneLane', true, 'abc',
  'active', 'seed', now(), now()
);

insert into ids select 'disputed', id from public.duels where host = '94000000-0000-4000-8000-000000000003';

select pg_temp.act_as('94000000-0000-4000-8000-000000000003');
set local role authenticated;
select public.submit_board((select id from ids where name = 'disputed'), 1, '{"round":1}');
select pg_temp.act_as('94000000-0000-4000-8000-000000000004');
select public.submit_board((select id from ids where name = 'disputed'), 1, '{"round":1}');
select public.submit_board((select id from ids where name = 'disputed'), 2, '{"round":2}');
select pg_temp.act_as('94000000-0000-4000-8000-000000000003');
select public.submit_board((select id from ids where name = 'disputed'), 2, '{"round":2}');
select pg_temp.act_as('94000000-0000-4000-8000-000000000004');

-- Both claim the win.
select public.report_duel((select id from ids where name = 'disputed'), 1::smallint, false);
select pg_temp.act_as('94000000-0000-4000-8000-000000000003');
select public.report_duel((select id from ids where name = 'disputed'), 0::smallint, false);

-- Players cannot read the queue or settle disputes themselves.
do $$
begin
  perform public.arbitration_queue(10);
  raise exception 'A player read the arbitration queue';
exception when insufficient_privilege then
  null;
end;
$$;

reset role;

do $$
declare
  queue jsonb := public.arbitration_queue(10);
begin
  if (select status from public.duels where id = (select id from ids where name = 'disputed')) <> 'disputed'
    or jsonb_array_length(queue) <> 1
    or jsonb_array_length(queue -> 0 -> 'boards') <> 4
    or queue -> 0 ->> 'balance' <> 'abc'
  then
    raise exception 'The disputed ranked duel did not keep its boards for the arbiter: %', queue;
  end if;
end;
$$;

-- The replay shows the host won: the guest lied, the host gets the win and their dispute back.
select public.arbitrate_duel((select id from ids where name = 'disputed'), 0::smallint);

do $$
declare
  game public.duels := (select d from public.duels d where d.id = (select id from ids where name = 'disputed'));
begin
  if game.status <> 'finished' or game.ended_by <> 'arbiter' or game.winner <> game.host
    or game.false_reporters <> array[game.guest]
    or pg_temp.rating(game.host) <= 0
    or (select dispute_score from public.coaches where id = game.host) <> 0
    or (select dispute_score from public.coaches where id = game.guest) <> 1
    or exists (select 1 from public.duel_boards where duel_id = game.id)
    or jsonb_array_length(public.arbitration_queue(10)) <> 0
  then
    raise exception 'The arbiter did not settle the dispute: %', row_to_json(game);
  end if;

  if public.has_sanction(game.guest, 'ranked') then
    raise exception 'One false report closed ranked';
  end if;
end;
$$;

-- A second false report within 30 days closes ranked for 14 days.
insert into public.duels (host, guest, mode, ranked, status, host_result, guest_result, finished_at)
values (
  '94000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000004', 'oneLane', true,
  'disputed', 0, 1, now()
);

select public.arbitrate_duel(
  (select id from public.duels where status = 'disputed' and guest = '94000000-0000-4000-8000-000000000004'),
  0::smallint
);

do $$
begin
  if not public.has_sanction('94000000-0000-4000-8000-000000000004', 'ranked')
    or public.has_sanction('94000000-0000-4000-8000-000000000003', 'ranked')
  then
    raise exception 'Two false reports did not close ranked, or the truthful coach lost it';
  end if;
end;
$$;

select pg_temp.act_as('94000000-0000-4000-8000-000000000004');
set local role authenticated;

do $$
begin
  perform public.find_match('oneLane', 'abc');
  raise exception 'A coach kept out of ranked joined the queue';
exception when sqlstate 'P0403' then
  null;
end;
$$;

reset role;

-- A replay that cannot decide leaves the dispute uncounted and lets its boards go.
insert into public.duels (host, guest, mode, ranked, status, host_result, guest_result, finished_at)
values (
  '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000005', 'oneLane', true,
  'disputed', 0, 1, now()
);

select public.arbitrate_duel(
  (select id from public.duels where guest = '94000000-0000-4000-8000-000000000005'),
  null
);

do $$
begin
  if (select status from public.duels where guest = '94000000-0000-4000-8000-000000000005') <> 'disputed'
    or (select arbitrated_at from public.duels where guest = '94000000-0000-4000-8000-000000000005') is null
    or pg_temp.rating('94000000-0000-4000-8000-000000000005') <> 0
  then
    raise exception 'An undecided replay changed the duel';
  end if;
end;
$$;

-- Abuse reports from coaches the reported coach never wrote to do not mute anyone.
create function pg_temp.report_as(reporter text, reported text, why text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', reporter, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', reporter, 'is_anonymous', false)::text, true);
  set local role authenticated;
  perform public.report_player(gen_random_uuid(), reported::uuid, why, '');
  reset role;
end;
$$;

select pg_temp.report_as('94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000009', 'abuse');
select pg_temp.report_as('94000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000009', 'abuse');
select pg_temp.report_as('94000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000009', 'abuse');

do $$
begin
  if public.has_sanction('94000000-0000-4000-8000-000000000009', 'chat') then
    raise exception 'Coaches who never got a message muted a coach';
  end if;
end;
$$;

rollback;
