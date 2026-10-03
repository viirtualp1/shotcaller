-- Run after migrations in a disposable Supabase database. All writes roll back.
-- now() is fixed within a transaction, so the suite moves the recorded times back instead of waiting.
begin;
insert into auth.users(id) values
  ('90000000-0000-4000-8000-000000000001'),
  ('90000000-0000-4000-8000-000000000002');
insert into public.coaches(id, friend_code) values
  ('90000000-0000-4000-8000-000000000001', 'AAAA5555'),
  ('90000000-0000-4000-8000-000000000002', 'BBBB5555');
insert into public.friendships(requester, addressee, accepted) values
  ('90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', true);

create temp table ids(name text primary key, id uuid);
grant all on ids to authenticated;

create function pg_temp.act_as(coach uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coach::text, true), set_config('request.jwt.claims', '{"is_anonymous":false}', true)
$$;

create function pg_temp.expect_error(statement text, code text) returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected % from: %', code, statement;
exception when others then
  if sqlstate <> code then
    raise;
  end if;
end;
$$;

select pg_temp.act_as('90000000-0000-4000-8000-000000000001');
set local role authenticated;
insert into ids values ('duel', public.invite_duel('90000000-0000-4000-8000-000000000002'));
select pg_temp.act_as('90000000-0000-4000-8000-000000000002');
select public.respond_duel((select id from ids where name = 'duel'), true);

-- The host pauses; nobody can pause on top of it, and the guest has to wait before resuming.
select pg_temp.act_as('90000000-0000-4000-8000-000000000001');
select public.pause_duel((select id from ids where name = 'duel'));

do $$
declare
  game public.duels;
begin
  select * into game from public.duels where id = (select id from ids where name = 'duel');

  if game.paused_by <> '90000000-0000-4000-8000-000000000001' or game.host_pauses <> 1 or game.guest_pauses <> 0 then
    raise exception 'The pause was not recorded for the host';
  end if;
end;
$$;

select pg_temp.act_as('90000000-0000-4000-8000-000000000002');
select pg_temp.expect_error(format('select public.pause_duel(%L)', (select id from ids where name = 'duel')), 'P0409');
select pg_temp.expect_error(format('select public.resume_duel(%L)', (select id from ids where name = 'duel')), 'P0425');

-- Thirty seconds later the guest resumes, and the round clock moves on by the pause.
reset role;
update public.duels
set paused_at = paused_at - interval '30 seconds', round_opened_at = now() - interval '40 seconds'
where id = (select id from ids where name = 'duel');
set local role authenticated;

select public.resume_duel((select id from ids where name = 'duel'));

do $$
declare
  game public.duels;
begin
  select * into game from public.duels where id = (select id from ids where name = 'duel');

  if game.paused_by is not null or game.paused_at is not null then
    raise exception 'The guest could not resume after ten seconds';
  end if;

  if game.round_opened_at <> now() - interval '10 seconds' then
    raise exception 'The round clock did not move on by the pause';
  end if;
end;
$$;

-- The host waits out the cooldown for a second pause, resumes it at once, and has none left after that.
select pg_temp.act_as('90000000-0000-4000-8000-000000000001');
select pg_temp.expect_error(format('select public.pause_duel(%L)', (select id from ids where name = 'duel')), 'P0425');

reset role;
update public.duels set host_paused_last = now() - interval '91 seconds' where id = (select id from ids where name = 'duel');
set local role authenticated;

select public.pause_duel((select id from ids where name = 'duel'));
select public.resume_duel((select id from ids where name = 'duel'));

reset role;
update public.duels set host_paused_last = now() - interval '91 seconds' where id = (select id from ids where name = 'duel');
set local role authenticated;

select pg_temp.expect_error(format('select public.pause_duel(%L)', (select id from ids where name = 'duel')), 'P0429');

-- A paused round keeps its time: the win cannot be claimed while the pause runs.
select pg_temp.act_as('90000000-0000-4000-8000-000000000002');
select public.pause_duel((select id from ids where name = 'duel'));

reset role;
update public.duels set round_opened_at = now() - interval '170 seconds' where id = (select id from ids where name = 'duel');
set local role authenticated;

select pg_temp.act_as('90000000-0000-4000-8000-000000000001');
select pg_temp.expect_error(format('select public.claim_duel(%L)', (select id from ids where name = 'duel')), 'P0425');

-- Only the two coaches can pause their duel.
reset role;
insert into auth.users(id) values ('90000000-0000-4000-8000-000000000003');
select pg_temp.act_as('90000000-0000-4000-8000-000000000003');
set local role authenticated;
select pg_temp.expect_error(format('select public.resume_duel(%L)', (select id from ids where name = 'duel')), '42501');

rollback;
