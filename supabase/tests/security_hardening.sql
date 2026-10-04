-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;

insert into auth.users(id, is_anonymous) values
  ('90000000-0000-4000-8000-000000000001', false),
  ('90000000-0000-4000-8000-000000000002', false),
  ('90000000-0000-4000-8000-000000000003', true);
insert into auth.identities(id, user_id, provider_id, provider, identity_data) values
  (gen_random_uuid(), '90000000-0000-4000-8000-000000000001', 'google-1', 'google',
    '{"avatar_url":"https://lh3.googleusercontent.com/a/photo"}'),
  (gen_random_uuid(), '90000000-0000-4000-8000-000000000002', 'email-2', 'email',
    '{"avatar_url":"https://lh3.googleusercontent.com/a/not-google-sign-in"}');
insert into public.coaches(id, friend_code) values
  ('90000000-0000-4000-8000-000000000001', 'AAAA9999'),
  ('90000000-0000-4000-8000-000000000002', 'BBBB9999');
insert into public.friendships(requester, addressee, accepted) values
  ('90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', true);

do $$
begin
  if has_function_privilege('authenticated', 'public.profiles_sync_coach()', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.friendships_forget_chat()', 'EXECUTE')
    or has_function_privilege('anon', 'public.notify_support_request()', 'EXECUTE')
  then
    raise exception 'Trigger functions are callable through the API';
  end if;
end;
$$;

-- Tables created after the hardening stay private until a migration grants them.
create table public.hardening_probe (id integer);

do $$
begin
  if has_table_privilege('anon', 'public.hardening_probe', 'SELECT')
    or has_table_privilege('authenticated', 'public.hardening_probe', 'SELECT')
  then
    raise exception 'New tables are exposed by default';
  end if;
end;
$$;

-- Every SECURITY DEFINER function reachable through the API is one the game calls on purpose.
do $$
declare
  exposed text;
begin
  select string_agg(p.proname || ' to ' || r.rolname, ', ' order by p.proname)
  into exposed
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join (values ('anon'), ('authenticated')) as r(rolname)
  where n.nspname = 'public'
    and p.prosecdef
    and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
    and not (r.rolname = 'anon' and p.proname = 'mmr_leaderboard')
    and not (r.rolname = 'authenticated' and p.proname = any (array[
      'block_coach', 'cancel_duel', 'claim_duel', 'coach_live_match', 'coach_match', 'coach_profile',
      'conversation', 'delete_account', 'duel_board', 'duel_board_sent', 'ensure_coach', 'find_match',
      'forfeit_duel', 'friends_online', 'invite_duel', 'keep_live_match', 'leave_queue', 'list_blocked',
      'list_friends', 'mark_read', 'mmr_leaderboard', 'my_duels', 'my_privacy', 'my_ratings', 'pause_duel',
      'publish_live_match', 'remove_friend', 'report_duel', 'request_friend', 'request_leaderboard_friend',
      'reserve_telemetry', 'respond_duel', 'respond_friend', 'resume_duel', 'send_message', 'set_coach_photo',
      'set_privacy', 'submit_board', 'submit_feedback', 'unblock_coach', 'unread_counts', 'withdraw_board'
    ]));

  if exposed is not null then
    raise exception 'Unexpected SECURITY DEFINER functions exposed: %', exposed;
  end if;
end;
$$;

-- The photo comes from the Google identity, whatever the client or its editable metadata say.
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"is_anonymous":false,"user_metadata":{"avatar_url":"https://tracker.example/pixel.gif"}}',
  true
);
set local role authenticated;
select public.set_coach_photo('https://tracker.example/pixel.gif');
reset role;

do $$
begin
  if (select photo from public.coaches where id = '90000000-0000-4000-8000-000000000001')
    is distinct from 'https://lh3.googleusercontent.com/a/photo'
  then
    raise exception 'Photo was not taken from the Google identity';
  end if;
end;
$$;

-- Without a Google sign-in there is no photo to show.
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.set_coach_photo('https://tracker.example/pixel.gif');
reset role;

do $$
begin
  if (select photo from public.coaches where id = '90000000-0000-4000-8000-000000000002') is not null then
    raise exception 'Photo kept without a Google identity';
  end if;
end;
$$;

do $$
begin
  update public.coaches set photo = 'https://tracker.example/pixel.gif'
  where id = '90000000-0000-4000-8000-000000000002';
  raise exception 'Foreign photo host accepted';
exception when check_violation then
  null;
end;
$$;

-- A guest whose id somehow sits in a friendship still reads nothing.
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"is_anonymous":true}', true);
set local role authenticated;

do $$
begin
  if exists (select 1 from public.friendships) then
    raise exception 'Guest reads friendships';
  end if;
end;
$$;

select set_config('request.jwt.claims', '{"is_anonymous":false}', true);

do $$
begin
  if not exists (select 1 from public.friendships) then
    raise exception 'Registered coach lost their friendships';
  end if;
end;
$$;

reset role;
rollback;
