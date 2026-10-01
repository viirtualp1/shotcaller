-- Disposable database only; all submissions roll back.
begin;
insert into auth.users (id) values ('40000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"is_anonymous":true}', true);
set local role authenticated;

do $$
begin
  if has_table_privilege('authenticated', 'public.support_requests', 'SELECT')
    or has_table_privilege('authenticated', 'public.support_requests', 'INSERT')
    or has_function_privilege('anon', 'public.submit_feedback(uuid,text,text,text,text,text,text)', 'EXECUTE')
  then
    raise exception 'Private support inbox exposed';
  end if;

  perform public.submit_feedback(
    '50000000-0000-4000-8000-000000000001', 'bug', '  Broken sync  ',
    '  Cloud save fails after a long match.  ', '', '8.6.2', 'ru'
  );

  -- A network retry reuses the ID and must not create another message or consume quota.
  perform public.submit_feedback(
    '50000000-0000-4000-8000-000000000001', 'bug', 'Broken sync',
    'Cloud save fails after a long match.', null, '8.6.2', 'ru'
  );

  begin
    perform public.submit_feedback(gen_random_uuid(), 'bug', 'Short', 'Too short', null, '8.6.2', 'en');
    raise exception 'Short message accepted';
  exception when check_violation then
    null;
  end;

  begin
    perform public.submit_feedback(
      gen_random_uuid(), 'bug', 'Invalid email', 'Cloud save fails after a long match.',
      'not-an-email', '8.6.2', 'en'
    );
    raise exception 'Invalid reply address accepted';
  exception when check_violation then
    null;
  end;

  for i in 1..2 loop
    perform public.submit_feedback(
      gen_random_uuid(), 'idea', 'A suggestion', 'A useful suggestion with enough text.', null, '8.6.2', 'en'
    );
  end loop;

  begin
    perform public.submit_feedback(
      gen_random_uuid(), 'idea', 'Fourth request', 'A useful suggestion with enough text.', null, '8.6.2', 'en'
    );
    raise exception 'Hourly quota bypassed';
  exception when raise_exception then
    if sqlerrm <> 'feedback_rate_limit' then
      raise;
    end if;
  end;
end;
$$;

reset role;
do $$
begin
  if (select count(*) from public.support_requests) <> 3
    or not exists (
      select 1 from public.support_requests
      where id = '50000000-0000-4000-8000-000000000001'
        and subject = 'Broken sync' and message = 'Cloud save fails after a long match.'
        and reply_email is null and status = 'new'
        and sender = '40000000-0000-4000-8000-000000000001'
    )
  then
    raise exception 'Submission fields or retry deduplication failed';
  end if;

  -- Spread previous messages across the day; daily quota applies even without an hourly burst.
  update public.support_requests set created_at = now() - interval '2 hours';
  for i in 1..7 loop
    insert into public.support_requests (id, sender, category, subject, message, game_version, language, created_at)
    values (gen_random_uuid(), auth.uid(), 'other', 'Previous request', repeat('x', 30), '8.6.2', 'en', now() - interval '2 hours');
  end loop;
end;
$$;

set local role authenticated;
do $$
begin
  begin
    perform public.submit_feedback(gen_random_uuid(), 'other', 'Daily limit', repeat('x', 30), null, '8.6.2', 'en');
    raise exception 'Daily quota bypassed';
  exception when raise_exception then
    if sqlerrm <> 'feedback_rate_limit' then
      raise;
    end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  begin
    perform public.submit_feedback(gen_random_uuid(), 'bug', 'No session', repeat('x', 30), null, '8.6.2', 'en');
    raise exception 'Unauthenticated submission accepted';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
rollback;
