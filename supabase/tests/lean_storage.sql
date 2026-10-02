-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;

insert into auth.users (id) values
  ('80000000-0000-4000-8000-000000000001'),
  ('80000000-0000-4000-8000-000000000002'),
  ('80000000-0000-4000-8000-000000000003');
insert into public.coaches (id, friend_code, name) values
  ('80000000-0000-4000-8000-000000000001', 'AAAA4444', 'Player'),
  ('80000000-0000-4000-8000-000000000002', 'BBBB4444', 'Friend'),
  ('80000000-0000-4000-8000-000000000003', 'CCCC4444', 'Stranger');
insert into public.friendships (requester, addressee, accepted) values
  ('80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', true);

create function pg_temp.act_as(coach uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coach::text, true),
    set_config('request.jwt.claims', '{"is_anonymous":false}', true)
$$;

select pg_temp.act_as('80000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
begin
  if public.keep_live_match() is not null then
    raise exception 'Missing live match was not signalled';
  end if;

  if public.publish_live_match('{"record":{"duel":{"opponentName":"Private"}},"phase":"planning"}') then
    raise exception 'Unwatched snapshot was marked watched';
  end if;
end;
$$;

-- Strangers cannot watch, and only friends are returned by the presence heartbeat.
select pg_temp.act_as('80000000-0000-4000-8000-000000000003');
select public.friends_online('match', 1);
do $$
begin
  if public.coach_live_match('80000000-0000-4000-8000-000000000001') is not null then
    raise exception 'A stranger watched a live match';
  end if;
end;
$$;

select pg_temp.act_as('80000000-0000-4000-8000-000000000002');
select public.friends_online('menu', null);
do $$
declare
  snapshot jsonb := public.coach_live_match('80000000-0000-4000-8000-000000000001');
begin
  if snapshot is null or snapshot #> '{record,duel}' <> 'null'::jsonb then
    raise exception 'Live match missing or opponent identity leaked';
  end if;
end;
$$;

select pg_temp.act_as('80000000-0000-4000-8000-000000000001');
do $$
begin
  if not public.keep_live_match() then
    raise exception 'Watcher demand was lost';
  end if;

  if (select count(*) from public.friends_online('duel', 2)) <> 1 then
    raise exception 'Presence did not return only the online friend';
  end if;
end;
$$;

reset role;
update public.live_matches set watched_at = now() - interval '11 seconds';
update public.coaches set seen_at = now() - interval '76 seconds'
where id = '80000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$
begin
  if public.keep_live_match() then
    raise exception 'A departed viewer kept streaming enabled';
  end if;

  if exists (select 1 from public.friends_online('menu', null)) then
    raise exception 'An expired friend heartbeat stayed online';
  end if;
end;
$$;

-- Retention deletes disposable data and keeps durable progress and current data.
reset role;
insert into public.profiles (id, name, data, updated_at) values
  ('80000000-0000-4000-8000-000000000001', 'Player', '{}', now() - interval '100 days');
insert into public.matches (user_id, id, played_at, verdict, data) values
  ('80000000-0000-4000-8000-000000000001', 'old', now() - interval '91 days', 'draw', '{"replays":[1],"roundLineups":[2],"rounds":3}'),
  ('80000000-0000-4000-8000-000000000001', 'recent', now(), 'draw', '{"replays":[1],"roundLineups":[2],"rounds":3}');
insert into public.duels (host, guest, status, finished_at, round_opened_at) values
  ('80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', 'finished', now() - interval '31 days', null),
  ('80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', 'active', null, now() - interval '31 minutes');
insert into public.duel_boards (duel_id, round, side, board)
select id, 1, 0, '{}' from public.duels
where host = '80000000-0000-4000-8000-000000000001' and status = 'finished';
update public.live_matches set updated_at = now() - interval '11 minutes';

select public.settle_stale_duels();
select public.cleanup_old_data();
do $$
begin
  if exists (select 1 from public.matches where id = 'old')
    or exists (select 1 from public.duel_boards where duel_id in
      (select id from public.duels where host = '80000000-0000-4000-8000-000000000001'))
    or exists (select 1 from public.live_matches where user_id = '80000000-0000-4000-8000-000000000001')
    or exists (select 1 from public.duels where host = '80000000-0000-4000-8000-000000000001' and status in ('active', 'finished'))
  then
    raise exception 'Expired disposable data survived cleanup';
  end if;

  if not exists (select 1 from public.profiles where id = '80000000-0000-4000-8000-000000000001')
    or not exists (select 1 from public.duels where host = '80000000-0000-4000-8000-000000000001' and status = 'abandoned')
    or not exists (select 1 from public.matches where id = 'recent' and data = '{"rounds":3}'::jsonb)
  then
    raise exception 'Durable progress or recent history was removed';
  end if;

  if has_function_privilege('authenticated', 'public.cleanup_old_data()', 'EXECUTE')
    or has_function_privilege('anon', 'public.friends_online(text, integer)', 'EXECUTE')
    or has_table_privilege('authenticated', 'public.live_matches', 'SELECT')
  then
    raise exception 'Cleanup or live data internals are exposed';
  end if;
end;
$$;

rollback;
