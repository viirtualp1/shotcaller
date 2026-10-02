-- Apply all migrations first. These fixtures and deletions run only inside a rolled-back transaction.
begin;

insert into auth.users(id, is_anonymous) values
  ('88000000-0000-4000-8000-000000000001', false),
  ('88000000-0000-4000-8000-000000000002', false),
  ('88000000-0000-4000-8000-000000000003', true);
insert into public.coaches(id, friend_code, name) values
  ('88000000-0000-4000-8000-000000000001', 'AAAA8888', 'Delete me'),
  ('88000000-0000-4000-8000-000000000002', 'BBBB8888', 'Keep me');
insert into public.profiles(id, name, data) values
  ('88000000-0000-4000-8000-000000000001', 'Delete me', '{}'),
  ('88000000-0000-4000-8000-000000000002', 'Keep me', '{}');
insert into public.matches(user_id, id, played_at, verdict, data) values
  ('88000000-0000-4000-8000-000000000001', 'owned-match', now(), 'win', '{}'),
  ('88000000-0000-4000-8000-000000000002', 'other-match', now(), 'win', '{}');
insert into public.ratings(coach_id, mode, rating, peak) values
  ('88000000-0000-4000-8000-000000000001', 'threeLanes', 500, 500);
insert into public.friendships(requester, addressee, accepted) values
  ('88000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000002', true);
insert into public.messages(sender, recipient, body) values
  ('88000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000002', 'Sent'),
  ('88000000-0000-4000-8000-000000000002', '88000000-0000-4000-8000-000000000001', 'Received');
insert into public.blocks(blocker, blocked) values
  ('88000000-0000-4000-8000-000000000002', '88000000-0000-4000-8000-000000000001');
insert into public.friend_declines(requester, addressee) values
  ('88000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000002');
insert into public.duels(id, host, guest) values
  ('88000000-0000-4000-8000-000000000010', '88000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000002');
insert into public.duel_boards(duel_id, round, side, board) values
  ('88000000-0000-4000-8000-000000000010', 1, 0, '{}');
insert into public.match_queue(coach_id, mode, rating, balance) values
  ('88000000-0000-4000-8000-000000000001', 'threeLanes', 500, 'test');
insert into public.live_matches(user_id, data) values
  ('88000000-0000-4000-8000-000000000001', '{}');
insert into public.telemetry_consent(user_id, version, enabled, analytics_id) values
  ('88000000-0000-4000-8000-000000000001', 2, true, '88000000-0000-4000-8000-000000000020');
insert into public.telemetry_consent_log(user_id, version, enabled) values
  ('88000000-0000-4000-8000-000000000001', 2, true);
insert into public.telemetry_receipts(user_id, match_id) values
  ('88000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000030');
insert into public.support_requests(id, sender, category, subject, message, reply_email, game_version, language) values
  ('88000000-0000-4000-8000-000000000040', '88000000-0000-4000-8000-000000000001', 'bug', 'Delete this', 'Private feedback to erase completely.', 'qa@example.test', '8.8.1', 'en');

do $$
begin
  if has_function_privilege('anon', 'public.delete_account()', 'execute') then
    raise exception 'Anonymous callers must not have account deletion access';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);
set local role authenticated;
do $$
begin
  perform public.delete_account();
  raise exception 'An absent caller was allowed to delete an account';
exception when insufficient_privilege then null;
end;
$$;

select set_config('request.jwt.claim.sub', '88000000-0000-4000-8000-000000000003', true);
do $$
begin
  perform public.delete_account();
  raise exception 'A guest was allowed to delete an account';
exception when insufficient_privilege then null;
end;
$$;

select set_config('request.jwt.claim.sub', '88000000-0000-4000-8000-000000000001', true);
select public.delete_account();
reset role;

do $$
declare
  caller uuid := '88000000-0000-4000-8000-000000000001';
begin
  if exists (select 1 from auth.users where id = caller)
    or exists (select 1 from public.profiles where id = caller)
    or exists (select 1 from public.coaches where id = caller)
    or exists (select 1 from public.matches where user_id = caller)
    or exists (select 1 from public.ratings where coach_id = caller)
    or exists (select 1 from public.friendships where caller in (requester, addressee))
    or exists (select 1 from public.messages where caller in (sender, recipient))
    or exists (select 1 from public.blocks where caller in (blocker, blocked))
    or exists (select 1 from public.friend_declines where caller in (requester, addressee))
    or exists (select 1 from public.duels where caller in (host, guest))
    or exists (select 1 from public.duel_boards where duel_id = '88000000-0000-4000-8000-000000000010')
    or exists (select 1 from public.match_queue where coach_id = caller)
    or exists (select 1 from public.live_matches where user_id = caller)
    or exists (select 1 from public.telemetry_consent where user_id = caller)
    or exists (select 1 from public.telemetry_consent_log where user_id = caller)
    or exists (select 1 from public.telemetry_receipts where user_id = caller)
    or exists (select 1 from public.support_requests where id = '88000000-0000-4000-8000-000000000040')
  then
    raise exception 'Deletion left account data behind';
  end if;

  if not exists (select 1 from auth.users where id = '88000000-0000-4000-8000-000000000002')
    or not exists (select 1 from public.profiles where id = '88000000-0000-4000-8000-000000000002')
    or not exists (select 1 from public.matches where id = 'other-match')
  then
    raise exception 'Deletion affected another coach account';
  end if;

  if not exists (select 1 from public.telemetry_deletions where analytics_id = '88000000-0000-4000-8000-000000000020') then
    raise exception 'External statistics were not queued for erasure';
  end if;
end;
$$;

rollback;
