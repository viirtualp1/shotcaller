-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;
insert into auth.users(id) values
  ('80000000-0000-4000-8000-000000000001'),
  ('80000000-0000-4000-8000-000000000002');
insert into public.coaches(id, friend_code) values
  ('80000000-0000-4000-8000-000000000001', 'AAAA4444'),
  ('80000000-0000-4000-8000-000000000002', 'BBBB4444');
insert into public.friendships(requester, addressee, accepted) values
  ('80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', true);

create temp table ids(name text primary key, id uuid);
grant all on ids to authenticated;

create function pg_temp.act_as(coach uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coach::text, true), set_config('request.jwt.claims', '{"is_anonymous":false}', true)
$$;

select pg_temp.act_as('80000000-0000-4000-8000-000000000001');
set local role authenticated;
insert into ids values ('duel', public.invite_duel('80000000-0000-4000-8000-000000000002', 'twoLanes'));
select pg_temp.act_as('80000000-0000-4000-8000-000000000002');
select public.respond_duel((select id from ids where name = 'duel'), true);

-- The host sends a board, takes it back while the guest plans, and sends a different one.
select pg_temp.act_as('80000000-0000-4000-8000-000000000001');
select public.submit_board((select id from ids where name = 'duel'), 1, '{"plan":"first"}');

do $$
begin
  if not public.withdraw_board((select id from ids where name = 'duel'), 1) then
    raise exception 'A board could not be taken back before the other side was ready';
  end if;

  if (select host_board_round from public.duels where id = (select id from ids where name = 'duel')) <> 0 then
    raise exception 'The withdrawn board still shows the host as ready';
  end if;
end;
$$;

select public.submit_board((select id from ids where name = 'duel'), 1, '{"plan":"second"}');

-- The guest is ready too: the round is fought with the second board, and nothing can be taken back.
select pg_temp.act_as('80000000-0000-4000-8000-000000000002');
do $$
begin
  if public.submit_board((select id from ids where name = 'duel'), 1, '{"plan":"guest"}') ->> 'plan' <> 'second' then
    raise exception 'The guest did not get the board sent after the withdrawal';
  end if;
end;
$$;

select pg_temp.act_as('80000000-0000-4000-8000-000000000001');
do $$
begin
  if public.withdraw_board((select id from ids where name = 'duel'), 1) then
    raise exception 'A board was taken back after both sides were ready';
  end if;
end;
$$;

-- In round two the guest is ready first, so the host's Fight cannot be taken back after it lands.
select pg_temp.act_as('80000000-0000-4000-8000-000000000002');
select public.submit_board((select id from ids where name = 'duel'), 2, '{"plan":"guest"}');
select pg_temp.act_as('80000000-0000-4000-8000-000000000001');
select public.submit_board((select id from ids where name = 'duel'), 2, '{"plan":"host"}');

do $$
begin
  if public.withdraw_board((select id from ids where name = 'duel'), 2) then
    raise exception 'A board was taken back although the other side was already ready';
  end if;

  if has_function_privilege('anon', 'public.withdraw_board(uuid, integer)', 'EXECUTE') then
    raise exception 'Guests without an account can withdraw boards';
  end if;
end;
$$;

reset role;
rollback;
