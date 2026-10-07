-- Moderation: reports keep their evidence, three trusted reporters restrict a coach until a moderator decides,
-- moderators sanction and lift from the SQL editor, and false reports cost the reporter the right to report.
-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;

insert into auth.users(id, is_anonymous, created_at) values
  ('93000000-0000-4000-8000-000000000001', false, now() - interval '30 days'),
  ('93000000-0000-4000-8000-000000000002', false, now() - interval '30 days'),
  ('93000000-0000-4000-8000-000000000003', false, now() - interval '30 days'),
  ('93000000-0000-4000-8000-000000000004', false, now()),
  ('93000000-0000-4000-8000-000000000005', false, now() - interval '30 days'),
  ('93000000-0000-4000-8000-000000000009', false, now() - interval '30 days');
insert into public.coaches(id, friend_code, name, photo) values
  ('93000000-0000-4000-8000-000000000001', 'AAAA9393', 'Ana', null),
  ('93000000-0000-4000-8000-000000000002', 'BBBB9393', 'Ben', null),
  ('93000000-0000-4000-8000-000000000003', 'CCCC9393', 'Cid', null),
  ('93000000-0000-4000-8000-000000000004', 'DDDD9393', 'Newbie', null),
  ('93000000-0000-4000-8000-000000000005', 'EEEE9393', 'Snitch', null),
  ('93000000-0000-4000-8000-000000000009', 'XXXX9393', 'Rude', 'https://lh3.googleusercontent.com/a/rude');
insert into public.profiles(id, name, data) values
  ('93000000-0000-4000-8000-000000000009', 'Rude', '{}'::jsonb);
insert into public.ratings(coach_id, mode, rating, peak) values
  ('93000000-0000-4000-8000-000000000009', 'threeLanes', 1700, 1700);
insert into public.friendships(requester, addressee, accepted) values
  ('93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000009', true);
insert into public.messages(sender, recipient, body) values
  ('93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000009', 'gg'),
  ('93000000-0000-4000-8000-000000000009', '93000000-0000-4000-8000-000000000001', 'you are trash'),
  -- Abuse reports count only from coaches the reported coach wrote to (20261007180000_ranked_integrity).
  ('93000000-0000-4000-8000-000000000009', '93000000-0000-4000-8000-000000000002', 'trash'),
  ('93000000-0000-4000-8000-000000000009', '93000000-0000-4000-8000-000000000003', 'trash'),
  ('93000000-0000-4000-8000-000000000009', '93000000-0000-4000-8000-000000000004', 'trash');

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

-- The report keeps the name, photo and chat as they were.
select pg_temp.report_as('93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000009', 'abuse');

do $$
declare
  proof jsonb := (select r.evidence from public.player_reports r where r.reporter = '93000000-0000-4000-8000-000000000001');
begin
  if proof ->> 'name' <> 'Rude' or proof ->> 'photo' is null
    or jsonb_array_length(proof -> 'chat') <> 2
    or proof -> 'chat' -> 1 ->> 'from' <> 'reported' or proof -> 'chat' -> 1 ->> 'body' <> 'you are trash'
    or proof -> 'ratings' ->> 'threeLanes' <> '1700'
  then
    raise exception 'The report did not keep its evidence: %', proof;
  end if;
end;
$$;

-- A fresh account does not count towards the threshold; the third trusted coach does.
select pg_temp.report_as('93000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000009', 'abuse');
select pg_temp.report_as('93000000-0000-4000-8000-000000000004', '93000000-0000-4000-8000-000000000009', 'abuse');

do $$
begin
  if public.has_sanction('93000000-0000-4000-8000-000000000009', 'chat') then
    raise exception 'Two trusted reports and a fresh account muted a coach';
  end if;
end;
$$;

select pg_temp.report_as('93000000-0000-4000-8000-000000000003', '93000000-0000-4000-8000-000000000009', 'abuse');

do $$
begin
  if not public.has_sanction('93000000-0000-4000-8000-000000000009', 'chat')
    or not exists (select 1 from public.player_reports r
      where r.reporter = '93000000-0000-4000-8000-000000000003' and r.evidence ->> 'auto' = 'chat')
  then
    raise exception 'Three trusted reports did not mute the chat';
  end if;
end;
$$;

-- A muted coach cannot write.
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000009', true),
  set_config('request.jwt.claims', '{"sub":"93000000-0000-4000-8000-000000000009","is_anonymous":false}', true);
set local role authenticated;

do $$
begin
  perform public.send_message('93000000-0000-4000-8000-000000000001', 'sorry');
  raise exception 'A muted coach sent a message';
exception when sqlstate 'P0403' then
  null;
end;
$$;

-- Players cannot moderate.
do $$
begin
  perform public.moderate_player('93000000-0000-4000-8000-000000000001', 'chat', 7, '');
  raise exception 'A player moderated another';
exception when insufficient_privilege then
  null;
end;
$$;

reset role;

-- A moderator's decision replaces the automatic mute and confirms the reports.
do $$
begin
  perform public.moderate_player('93000000-0000-4000-8000-000000000009', 'chat', 14, 'Insults');

  if (select count(*) from public.sanctions s
      where s.coach = '93000000-0000-4000-8000-000000000009' and s.kind = 'chat' and s.lifted_at is null) <> 1
    or exists (select 1 from public.sanctions s
      where s.coach = '93000000-0000-4000-8000-000000000009' and s.auto and s.lifted_at is null)
    or exists (select 1 from public.player_reports r
      where r.reported = '93000000-0000-4000-8000-000000000009' and r.status <> 'confirmed')
  then
    raise exception 'The moderator''s decision did not replace the automatic one';
  end if;
end;
$$;

-- A hidden name stays hidden through profile saves and comes back when lifted, without the photo.
do $$
begin
  perform public.moderate_player('93000000-0000-4000-8000-000000000009', 'name', 7, '');
  update public.profiles set name = 'Still rude', revision = revision + 1 where id = '93000000-0000-4000-8000-000000000009';

  if (select c.name from public.coaches c where c.id = '93000000-0000-4000-8000-000000000009') <> ''
    or (select c.photo from public.coaches c where c.id = '93000000-0000-4000-8000-000000000009') is not null
  then
    raise exception 'A hidden name or photo stayed visible';
  end if;

  perform public.lift_sanction('93000000-0000-4000-8000-000000000009', 'name');

  if (select c.name from public.coaches c where c.id = '93000000-0000-4000-8000-000000000009') <> 'Still rude' then
    raise exception 'A lifted name did not come back';
  end if;
end;
$$;

-- A name hidden for a while comes back when its time is up.
do $$
begin
  perform public.apply_sanction('93000000-0000-4000-8000-000000000009', 'name', now() + interval '1 day', false, '');
  update public.sanctions set until = now() - interval '1 minute'
  where coach = '93000000-0000-4000-8000-000000000009' and kind = 'name' and lifted_at is null;
  perform public.expire_sanctions();

  if (select c.name from public.coaches c where c.id = '93000000-0000-4000-8000-000000000009') <> 'Still rude' then
    raise exception 'An expired name sanction kept the name hidden';
  end if;
end;
$$;

-- Off the leaderboard, and its profile closed to strangers.
do $$
begin
  perform public.moderate_player('93000000-0000-4000-8000-000000000009', 'leaderboard', null, '');

  if exists (select 1 from public.mmr_leaderboard('threeLanes') l where l.id = '93000000-0000-4000-8000-000000000009') then
    raise exception 'A coach taken off the leaderboard is still on it';
  end if;
end;
$$;

-- Three rejected reports take the right to report away.
do $$
declare
  target uuid;
begin
  foreach target in array array[
    '93000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000002',
    '93000000-0000-4000-8000-000000000003'
  ]::uuid[] loop
    perform pg_temp.report_as('93000000-0000-4000-8000-000000000005', target::text, 'cheating');
    perform public.reject_reports(target, '');
  end loop;

  if not public.has_sanction('93000000-0000-4000-8000-000000000005', 'reports') then
    raise exception 'Three false reports did not take the right to report away';
  end if;

  begin
    perform pg_temp.report_as('93000000-0000-4000-8000-000000000005', '93000000-0000-4000-8000-000000000009', 'other');
    raise exception 'A coach without the right to report sent one';
  exception when sqlstate 'P0403' then
    null;
  end;
end;
$$;

rollback;
