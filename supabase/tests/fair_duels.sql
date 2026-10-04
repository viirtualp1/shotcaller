-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;
insert into auth.users(id) values
  ('70000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000002'),
  ('70000000-0000-4000-8000-000000000003'),
  ('70000000-0000-4000-8000-000000000004'),
  ('70000000-0000-4000-8000-000000000005');
insert into public.coaches(id, friend_code, name, photo) values
  ('70000000-0000-4000-8000-000000000001', 'AAAA3333', 'Host', 'https://lh3.googleusercontent.com/a/host'),
  ('70000000-0000-4000-8000-000000000002', 'BBBB3333', 'Guest', null),
  ('70000000-0000-4000-8000-000000000003', 'CCCC3333', 'Third', null),
  ('70000000-0000-4000-8000-000000000004', 'DDDD3333', 'Fourth', null),
  ('70000000-0000-4000-8000-000000000005', 'EEEE3333', 'Fifth', null);
insert into public.friendships(requester, addressee, accepted) values
  ('70000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', true);

create temp table ids(name text primary key, id uuid);
grant all on ids to authenticated;

create function pg_temp.act_as(coach uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coach::text, true), set_config('request.jwt.claims', '{"is_anonymous":false}', true)
$$;

-- Elo: 25 between equals, more for an upset, never less than one point.
do $$
begin
  if public.elo_change(0, 0, true) <> 25 or public.elo_change(0, 0, false) <> -25
    or public.elo_change(0, 400, true) <> 45 or public.elo_change(400, 0, true) <> 5
    or public.elo_change(400, 0, false) <> -45 or public.elo_change(0, 4000, false) <> -1
  then
    raise exception 'Elo changes are off';
  end if;
end;
$$;

-- A friend duel: both boards in, then both reports agree.
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
set local role authenticated;
insert into ids values ('friendly', public.invite_duel('70000000-0000-4000-8000-000000000002', 'twoLanes'));

select pg_temp.act_as('70000000-0000-4000-8000-000000000002');
select public.respond_duel((select id from ids where name = 'friendly'), true);
select public.submit_board((select id from ids where name = 'friendly'), 1, '{"round":1}');
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
select public.submit_board((select id from ids where name = 'friendly'), 1, '{"round":1}');
select public.submit_board((select id from ids where name = 'friendly'), 2, '{"round":2}');
select pg_temp.act_as('70000000-0000-4000-8000-000000000002');
select public.submit_board((select id from ids where name = 'friendly'), 2, '{"round":2}');

reset role;
do $$
begin
  if exists (select 1 from public.duel_boards b join ids on ids.id = b.duel_id where b.round < 2) then
    raise exception 'Boards older than the last round were kept';
  end if;
end;
$$;

select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
set local role authenticated;
select public.report_duel((select id from ids where name = 'friendly'), 0::smallint, true);

reset role;
do $$
begin
  if public.in_active_duel('70000000-0000-4000-8000-000000000001') then
    raise exception 'A coach who reported is still held by the duel';
  end if;
end;
$$;

set local role authenticated;
do $$
begin
  if exists (select 1 from public.my_duels()) then
    raise exception 'A reported duel is still offered to resume';
  end if;
end;
$$;

-- A second, different report from the same side changes nothing.
select public.report_duel((select id from ids where name = 'friendly'), 1::smallint, false);
select pg_temp.act_as('70000000-0000-4000-8000-000000000002');
select public.report_duel((select id from ids where name = 'friendly'), 0::smallint, true);

reset role;
do $$
declare
  game public.duels := (select d from public.duels d join ids on ids.id = d.id where ids.name = 'friendly');
begin
  if game.status <> 'finished' or game.winner <> '70000000-0000-4000-8000-000000000001' then
    raise exception 'Agreeing reports did not finish the duel: %', game.status;
  end if;

  -- Friends pick each other, so a friendly duel never moves MMR.
  if exists (select 1 from public.ratings where coach_id in (game.host, game.guest) and mode = 'twoLanes')
    or exists (select 1 from public.duel_boards where duel_id = game.id)
  then
    raise exception 'Ratings or boards are wrong after the friendly duel';
  end if;
end;
$$;

-- The same result in a ranked duel does.
do $$
declare
  game public.duels;
begin
  insert into public.duels (host, guest, mode, ranked, status, winner, ended_by, finished_at)
  values (
    '70000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'twoLanes', true,
    'finished', '70000000-0000-4000-8000-000000000001', 'result', now()
  )
  returning * into game;

  perform public.settle_duel(game);

  if (select rating from public.ratings where coach_id = game.host and mode = 'twoLanes') is distinct from 25
    or (select rating from public.ratings where coach_id = game.guest and mode = 'twoLanes') is distinct from 0
  then
    raise exception 'A ranked duel did not move MMR';
  end if;
end;
$$;

-- The winner reports and the loser goes quiet: once the round runs out, the loser's claim settles the report.
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
set local role authenticated;
insert into ids values ('quiet', public.invite_duel('70000000-0000-4000-8000-000000000002', 'twoLanes'));
select pg_temp.act_as('70000000-0000-4000-8000-000000000002');
select public.respond_duel((select id from ids where name = 'quiet'), true);
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
select public.report_duel((select id from ids where name = 'quiet'), 0::smallint, false);

reset role;
update public.duels set round_opened_at = now() - interval '10 minutes' where id = (select id from ids where name = 'quiet');
select pg_temp.act_as('70000000-0000-4000-8000-000000000002');
set local role authenticated;
select public.claim_duel((select id from ids where name = 'quiet'));

reset role;
do $$
begin
  if (select winner from public.duels d join ids on ids.id = d.id where ids.name = 'quiet')
    <> '70000000-0000-4000-8000-000000000001'
  then
    raise exception 'A silent loser took the win by claiming';
  end if;
end;
$$;

-- One side reports a win, but the other keeps sending boards: a dispute, counted for both.
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
set local role authenticated;
insert into ids values ('split', public.invite_duel('70000000-0000-4000-8000-000000000002', 'twoLanes'));
select pg_temp.act_as('70000000-0000-4000-8000-000000000002');
select public.respond_duel((select id from ids where name = 'split'), true);
select public.report_duel((select id from ids where name = 'split'), 1::smallint, false);
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
select public.submit_board((select id from ids where name = 'split'), 1, '{"round":1}');

reset role;
update public.duels set round_opened_at = now() - interval '10 minutes' where id = (select id from ids where name = 'split');
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
set local role authenticated;
select public.claim_duel((select id from ids where name = 'split'));

reset role;
do $$
begin
  if (select status from public.duels d join ids on ids.id = d.id where ids.name = 'split') <> 'disputed'
    or (select dispute_score from public.coaches where id = '70000000-0000-4000-8000-000000000002') < 1
  then
    raise exception 'A contradicted report was not disputed';
  end if;
end;
$$;

-- Nobody sent a board: there is nothing to claim. Sending one's own board first wins on time.
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
set local role authenticated;
insert into ids values ('idle', public.invite_duel('70000000-0000-4000-8000-000000000002', 'oneLane'));
select pg_temp.act_as('70000000-0000-4000-8000-000000000002');
select public.respond_duel((select id from ids where name = 'idle'), true);

reset role;
update public.duels set round_opened_at = now() - interval '10 minutes' where id = (select id from ids where name = 'idle');
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
begin
  perform public.claim_duel((select id from ids where name = 'idle'));
  raise exception 'A coach who sent nothing won on time';
exception when sqlstate 'P0425' then
  null;
end;
$$;

select public.submit_board((select id from ids where name = 'idle'), 1, '{"round":1}');
select public.claim_duel((select id from ids where name = 'idle'));

reset role;
do $$
begin
  if (select ended_by from public.duels d join ids on ids.id = d.id where ids.name = 'idle') <> 'timeout' then
    raise exception 'The coach who played the round did not win on time';
  end if;
end;
$$;

-- Matchmaking: the first coach waits, the second finds them, and both get the same duel.
select pg_temp.act_as('70000000-0000-4000-8000-000000000003');
set local role authenticated;
do $$
begin
  if public.find_match('threeLanes', 'test-balance') is not null then
    raise exception 'A coach alone in the queue found a duel';
  end if;
end;
$$;

select pg_temp.act_as('70000000-0000-4000-8000-000000000004');
insert into ids values ('ranked', public.find_match('threeLanes', 'test-balance'));
select pg_temp.act_as('70000000-0000-4000-8000-000000000003');

do $$
declare
  matched_id constant uuid := (select id from ids where name = 'ranked');
begin
  if matched_id is null or public.find_match('threeLanes', 'test-balance') is distinct from matched_id then
    raise exception 'The waiting coach did not get the duel that was found';
  end if;

  if not (select d.ranked from public.my_duels() d where d.id = matched_id) then
    raise exception 'The found duel is not ranked';
  end if;
end;
$$;

-- A stranger's picture stays private; a friend's is shown.
reset role;
update public.duels set status = 'finished' where id = (select id from ids where name = 'ranked');
insert into ids values ('stranger', gen_random_uuid());
insert into public.duels (id, host, guest, mode, ranked, status, seed, started_at, round_opened_at)
values ((select id from ids where name = 'stranger'), '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000003', 'threeLanes', true, 'active', 'seed', now(), now());
select pg_temp.act_as('70000000-0000-4000-8000-000000000003');
set local role authenticated;
do $$
begin
  if (select opponent_photo from public.my_duels() where id = (select id from ids where name = 'stranger')) is not null then
    raise exception 'A stranger saw the coach picture';
  end if;
end;
$$;

reset role;
update public.duels set status = 'finished' where id = (select id from ids where name = 'stranger');

-- Coaches far apart in rating wait until their reach covers the gap.
insert into public.ratings (coach_id, mode, rating, peak) values ('70000000-0000-4000-8000-000000000005', 'oneLane', 900, 900);
select pg_temp.act_as('70000000-0000-4000-8000-000000000005');
set local role authenticated;
select public.find_match('oneLane', 'test-balance');
select pg_temp.act_as('70000000-0000-4000-8000-000000000004');
do $$
begin
  if public.find_match('oneLane', 'test-balance') is not null then
    raise exception 'Coaches 900 points apart were matched at once';
  end if;
end;
$$;

reset role;
update public.match_queue set joined_at = now() - interval '2 minutes' where coach_id = '70000000-0000-4000-8000-000000000005';
select pg_temp.act_as('70000000-0000-4000-8000-000000000004');
set local role authenticated;
insert into ids values ('reach', public.find_match('oneLane', 'test-balance'));

reset role;
do $$
begin
  if (select id from ids where name = 'reach') is null then
    raise exception 'A coach who waited long enough was not matched';
  end if;
end;
$$;

update public.duels set status = 'finished' where id = (select id from ids where name = 'reach');

-- Incompatible battle versions and blocked coaches never meet.
reset role;
update public.coaches set dispute_score = 3 where id = '70000000-0000-4000-8000-000000000003';
insert into public.blocks (blocker, blocked) values ('70000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000004');
select pg_temp.act_as('70000000-0000-4000-8000-000000000003');
set local role authenticated;
select public.find_match('twoLanes', 'older-balance');
select pg_temp.act_as('70000000-0000-4000-8000-000000000005');
select public.find_match('twoLanes', 'test-balance');
select pg_temp.act_as('70000000-0000-4000-8000-000000000004');
do $$
begin
  if public.find_match('twoLanes', 'test-balance') is not null then
    raise exception 'An incompatible or blocking coach was matched';
  end if;
end;
$$;

-- Leaving the queue right after being found still hands over the duel.
select pg_temp.act_as('70000000-0000-4000-8000-000000000005');
select public.leave_queue();
select pg_temp.act_as('70000000-0000-4000-8000-000000000001');
insert into ids values ('late', public.find_match('twoLanes', 'test-balance'));
select pg_temp.act_as('70000000-0000-4000-8000-000000000004');
do $$
begin
  if (select id from ids where name = 'late') is null
    or public.leave_queue() is distinct from (select id from ids where name = 'late')
  then
    raise exception 'A duel found while leaving the queue was lost';
  end if;
end;
$$;

do $$
begin
  if has_table_privilege('authenticated', 'public.match_queue', 'SELECT')
    or has_function_privilege('authenticated', 'public.settle_duel(public.duels)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.resolve_stale_duel(public.duels, boolean)', 'EXECUTE')
    or has_function_privilege('anon', 'public.find_match(text, text)', 'EXECUTE')
  then
    raise exception 'Matchmaking internals are exposed';
  end if;
end;
$$;

reset role;
rollback;
