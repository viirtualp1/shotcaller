-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;
insert into auth.users(id) values
  ('60000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002'),
  ('60000000-0000-4000-8000-000000000003');
insert into public.coaches(id, friend_code) values
  ('60000000-0000-4000-8000-000000000001', 'AAAA2222'),
  ('60000000-0000-4000-8000-000000000002', 'BBBB2222'),
  ('60000000-0000-4000-8000-000000000003', 'CCCC2222');
insert into public.friendships(requester, addressee, accepted) values
  ('60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', true);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"is_anonymous":false}', true);
set local role authenticated;
select public.publish_live_match('{"record":{"id":"live","duel":{"opponentName":"private"}},"phase":"battle","round":1,"elapsed":4}');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
do $$
declare
  snapshot jsonb := public.coach_live_match('60000000-0000-4000-8000-000000000001');
begin
  if snapshot is null or snapshot #> '{record,duel}' <> 'null'::jsonb then
    raise exception 'Friend cannot watch or private opponent name leaked';
  end if;

  if has_table_privilege('authenticated', 'public.live_matches', 'SELECT')
    or has_table_privilege('authenticated', 'public.live_matches', 'INSERT')
    or has_function_privilege('anon', 'public.coach_live_match(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.publish_live_match(jsonb)', 'EXECUTE')
  then
    raise exception 'Direct live-match access exposed';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000003', true);
do $$
begin
  if public.coach_live_match('60000000-0000-4000-8000-000000000001') is not null then
    raise exception 'Stranger can watch';
  end if;
end;
$$;

reset role;
insert into public.blocks(blocker, blocked) values
  ('60000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
set local role authenticated;
do $$
begin
  if public.coach_live_match('60000000-0000-4000-8000-000000000001') is not null then
    raise exception 'Block did not revoke live access';
  end if;
end;
$$;

reset role;
delete from public.blocks where blocker = '60000000-0000-4000-8000-000000000002';
update public.live_matches set updated_at = now() - interval '31 seconds';
set local role authenticated;
do $$
begin
  if public.coach_live_match('60000000-0000-4000-8000-000000000001') is not null then
    raise exception 'Stale broadcast is still available';
  end if;
end;
$$;

reset role;
update public.live_matches set updated_at = now();
delete from public.friendships where requester = '60000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$
begin
  if public.coach_live_match('60000000-0000-4000-8000-000000000001') is not null then
    raise exception 'Removed friend can still watch';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select public.publish_live_match(null);
reset role;
do $$
begin
  if exists (select 1 from public.live_matches where user_id = auth.uid()) then
    raise exception 'Stopped broadcast was not removed';
  end if;
end;
$$;
rollback;
