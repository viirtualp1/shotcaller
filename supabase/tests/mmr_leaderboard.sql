-- Public fields, authoritative ordering and a read-only leaderboard. All fixtures roll back.
begin;
do $$
begin
  if to_regprocedure('public.mmr_leaderboard(text)') is null then
    raise exception 'Apply supabase/migrations/20261003140000_mmr_leaderboard.sql before running this test';
  end if;

  if to_regprocedure('public.request_leaderboard_friend(uuid)') is not null then
    raise exception 'Apply supabase/migrations/20261003150000_read_only_leaderboard.sql before running this test';
  end if;
end;
$$;

insert into auth.users(id, is_anonymous) values
  ('71000000-0000-4000-8000-000000000001', false),
  ('71000000-0000-4000-8000-000000000002', false),
  ('71000000-0000-4000-8000-000000000003', false),
  ('71000000-0000-4000-8000-000000000004', true),
  ('71000000-0000-4000-8000-000000000005', false);
insert into public.coaches(id, friend_code, name, photo, rating) values
  ('71000000-0000-4000-8000-000000000001', 'AAAA4444', 'Alpha', 'https://lh3.googleusercontent.com/a/alpha', 99999),
  ('71000000-0000-4000-8000-000000000002', 'BBBB4444', 'Bravo', null, 0),
  ('71000000-0000-4000-8000-000000000003', 'CCCC4444', 'Charlie', null, 0),
  ('71000000-0000-4000-8000-000000000004', 'DDDD4444', 'Guest', null, 99999),
  ('71000000-0000-4000-8000-000000000005', 'EEEE4444', 'Echo', null, 0);
insert into public.ratings(coach_id, mode, rating, peak) values
  ('71000000-0000-4000-8000-000000000001', 'threeLanes', 1500, 1500),
  ('71000000-0000-4000-8000-000000000002', 'threeLanes', 1400, 1400),
  ('71000000-0000-4000-8000-000000000003', 'threeLanes', 1400, 1400),
  ('71000000-0000-4000-8000-000000000004', 'threeLanes', 2000, 2000),
  ('71000000-0000-4000-8000-000000000005', 'threeLanes', 0, 0),
  ('71000000-0000-4000-8000-000000000003', 'oneLane', 50, 50);

select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '{}', true);
set local role anon;
do $$
declare
  result jsonb;
  keys text[];
begin
  select jsonb_agg(to_jsonb(l)) into result from public.mmr_leaderboard('threeLanes') l;
  if jsonb_array_length(result) <> 4 or result -> 0 ->> 'name' <> 'Alpha'
    or (result -> 0 ->> 'rating')::integer <> 1500
    or result -> 1 ->> 'name' <> 'Bravo' or result -> 2 ->> 'name' <> 'Charlie'
    or result -> 1 ->> 'position' <> '2' or result -> 2 ->> 'position' <> '2'
    or result -> 3 ->> 'position' <> '4'
  then
    raise exception 'Leaderboard ordering, ties or server ratings are wrong';
  end if;

  select array_agg(key order by key) into keys from jsonb_object_keys(result -> 0) key;
  if keys <> array['avatar', 'id', 'name', 'photo', 'position', 'rating'] then
    raise exception 'Leaderboard exposed extra data';
  end if;

  if (select count(*) from public.mmr_leaderboard('oneLane')) <> 1
    or (select rating from public.mmr_leaderboard('oneLane')) <> 50
    or exists (select 1 from public.mmr_leaderboard('twoLanes'))
  then
    raise exception 'Mode ratings were mixed';
  end if;

  begin
    perform public.mmr_leaderboard('invalid');
    raise exception 'Invalid mode was accepted';
  exception when invalid_parameter_value then null;
  end;

  if has_table_privilege('anon', 'public.coaches', 'select')
    or has_table_privilege('anon', 'public.ratings', 'select')
  then
    raise exception 'Public read accidentally granted broader privileges';
  end if;
end;
$$;

reset role;
insert into public.blocks(blocker, blocked) values
  ('71000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true),
       set_config('request.jwt.claims', '{"is_anonymous":false}', true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.mmr_leaderboard('threeLanes') where name = 'Bravo') then
    raise exception 'A reverse block did not hide the coach';
  end if;

  if public.coach_profile('71000000-0000-4000-8000-000000000003') is not null then
    raise exception 'A public leaderboard coach exposed a private friend profile';
  end if;
end;
$$;

reset role;
insert into auth.users(id)
select ('71100000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid from generate_series(1, 105) i;
insert into public.coaches(id, friend_code, name)
select ('71100000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'ZZZZZZ' || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', i / 31 + 1, 1)
  || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', i % 31 + 1, 1), 'Coach ' || i
from generate_series(1, 105) i;
insert into public.ratings(coach_id, mode, rating, peak)
select ('71100000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'threeLanes', i, i
from generate_series(1, 105) i;
set local role authenticated;
do $$
begin
  if (select count(*) from public.mmr_leaderboard('threeLanes')) <> 100 then
    raise exception 'Leaderboard did not bound its output';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000004', true),
       set_config('request.jwt.claims', '{"is_anonymous":true}', true);
do $$
begin
  if (select count(*) from public.mmr_leaderboard('threeLanes')) <> 100 then
    raise exception 'A guest could not browse the public leaderboard';
  end if;
end;
$$;
rollback;
