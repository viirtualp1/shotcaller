-- Coach dossiers: friends see them, strangers see open ranked profiles only, and duel opponents stay hidden.
-- All fixtures roll back.
begin;
do $$
begin
  if to_regprocedure('public.public_coach_profile(uuid)') is null then
    raise exception 'Apply supabase/migrations/20261006120000_coach_dossier.sql before running this test';
  end if;
end;
$$;

insert into auth.users(id, is_anonymous) values
  ('72000000-0000-4000-8000-000000000001', false),
  ('72000000-0000-4000-8000-000000000002', false),
  ('72000000-0000-4000-8000-000000000003', false),
  ('72000000-0000-4000-8000-000000000004', false),
  ('72000000-0000-4000-8000-000000000005', true);
insert into public.coaches(id, friend_code, name, rating, public_profile) values
  ('72000000-0000-4000-8000-000000000001', 'AAAA5555', 'Viewer', 0, default),
  ('72000000-0000-4000-8000-000000000002', 'BBBB5555', 'Open', 1500, true),
  ('72000000-0000-4000-8000-000000000003', 'CCCC5555', 'Private', 1400, false),
  ('72000000-0000-4000-8000-000000000004', 'DDDD5555', 'Unranked', 0, true),
  ('72000000-0000-4000-8000-000000000005', 'EEEE5555', 'Guest', 0, true);
insert into public.ratings(coach_id, mode, rating, peak) values
  ('72000000-0000-4000-8000-000000000002', 'threeLanes', 1500, 1600),
  ('72000000-0000-4000-8000-000000000003', 'threeLanes', 1400, 1400);
update public.coaches set photo = 'https://lh3.googleusercontent.com/a/sample' where id in (
  '72000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000003'
);
insert into public.profiles(id, name, data) values
  ('72000000-0000-4000-8000-000000000002', 'Open', jsonb_build_object('profile', jsonb_build_object(
    'xp', 900,
    'totals', jsonb_build_object('matches', 3, 'wins', 2, 'losses', 1, 'draws', 0, 'bestWinStreak', 2),
    'heroes', jsonb_build_object('giant', jsonb_build_object('matches', 3, 'wins', 2)),
    'synergies', jsonb_build_object('guardian', jsonb_build_object('matches', 2, 'wins', 2)),
    'recent', jsonb_build_array(jsonb_build_object(
      'id', 'm1', 'mode', 'threeLanes', 'verdict', 'win',
      'lineup', jsonb_build_array(jsonb_build_object('heroId', 'giant', 'stars', 2, 'lane', 'mid', 'items', jsonb_build_array())),
      'duel', jsonb_build_object('opponentName', 'Secret rival'),
      'replays', jsonb_build_array()
    ))
  ))),
  ('72000000-0000-4000-8000-000000000003', 'Private', jsonb_build_object('profile', jsonb_build_object('xp', 10)));
insert into public.friendships(requester, addressee, accepted) values
  ('72000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000003', true);

-- A guest browsing the leaderboard opens an open ranked profile, but not a private or unranked one.
select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '{}', true);
set local role anon;
do $$
declare
  dossier jsonb;
  match jsonb;
begin
  dossier := public.public_coach_profile('72000000-0000-4000-8000-000000000002');
  if dossier is null or dossier ->> 'name' <> 'Open' or dossier -> 'heroes' -> 'giant' ->> 'wins' <> '2'
    or dossier -> 'synergies' -> 'guardian' ->> 'matches' <> '2'
    or (dossier -> 'recent' -> 0 ->> 'duel')::boolean is not true
    or dossier ? 'friendCode' or dossier -> 'recent' -> 0 ? 'replays'
    or dossier ->> 'photo' is not null
  then
    raise exception 'An open dossier was missing or exposed the wrong fields';
  end if;

  match := public.public_coach_match('72000000-0000-4000-8000-000000000002', 'm1');
  if match is null or (match ->> 'duel')::boolean is not true or match::text like '%Secret rival%' then
    raise exception 'A public match was missing or named the duel opponent';
  end if;

  if (select l.open from public.mmr_leaderboard('threeLanes') l where l.name = 'Open') is not true
    or (select l.open from public.mmr_leaderboard('threeLanes') l where l.name = 'Private') is not false
  then
    raise exception 'The leaderboard did not tell open profiles from private ones';
  end if;

  if public.public_coach_profile('72000000-0000-4000-8000-000000000003') is not null
    or public.public_coach_match('72000000-0000-4000-8000-000000000003', 'm1') is not null
  then
    raise exception 'A private profile was handed to a stranger';
  end if;

  if public.public_coach_profile('72000000-0000-4000-8000-000000000004') is not null then
    raise exception 'A coach off the leaderboard was handed to a stranger';
  end if;

  begin
    perform public.coach_dossier('72000000-0000-4000-8000-000000000002');
    raise exception 'The raw dossier builder was callable';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- A friend still sees a private profile, through either function.
reset role;
select set_config('request.jwt.claim.sub', '72000000-0000-4000-8000-000000000001', true),
       set_config('request.jwt.claims', '{"is_anonymous":false}', true);
set local role authenticated;
do $$
begin
  if public.coach_profile('72000000-0000-4000-8000-000000000003') ->> 'name' <> 'Private'
    or public.public_coach_profile('72000000-0000-4000-8000-000000000003') ->> 'name' <> 'Private'
    or public.public_coach_profile('72000000-0000-4000-8000-000000000003') ->> 'photo' <> 'https://lh3.googleusercontent.com/a/sample'
  then
    raise exception 'A friend lost access to a private profile';
  end if;

  if public.coach_profile('72000000-0000-4000-8000-000000000002') is not null then
    raise exception 'The friends-only function opened a stranger';
  end if;

  if public.my_public_profile() is not false then
    raise exception 'Profiles did not start private';
  end if;

  perform public.set_public_profile(true);
  if public.my_public_profile() is not true then
    raise exception 'A coach could not open the profile';
  end if;

  perform public.set_public_profile(false);
  if public.my_public_profile() is not false then
    raise exception 'A coach could not close the profile';
  end if;
end;
$$;

-- Blocking hides an open profile both ways.
reset role;
insert into public.blocks(blocker, blocked) values
  ('72000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
begin
  if public.public_coach_profile('72000000-0000-4000-8000-000000000002') is not null then
    raise exception 'A blocked coach could still open the profile';
  end if;
end;
$$;

-- A guest account cannot change visibility.
select set_config('request.jwt.claim.sub', '72000000-0000-4000-8000-000000000005', true),
       set_config('request.jwt.claims', '{"is_anonymous":true}', true);
do $$
begin
  begin
    perform public.set_public_profile(false);
    raise exception 'A guest changed profile visibility';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
