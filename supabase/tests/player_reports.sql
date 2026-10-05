-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;

insert into auth.users(id, is_anonymous) values
  ('92000000-0000-4000-8000-000000000001', false),
  ('92000000-0000-4000-8000-000000000002', false),
  ('92000000-0000-4000-8000-000000000003', true);
insert into public.coaches(id, friend_code, name) values
  ('92000000-0000-4000-8000-000000000001', 'AAAA9292', 'Reporter'),
  ('92000000-0000-4000-8000-000000000002', 'BBBB9292', 'Reported');

set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);

-- Players report through the RPC; a retry with the same ID records the report once.
select public.report_player('92000000-0000-4000-8000-000000000101', '92000000-0000-4000-8000-000000000002', 'abuse', '  Insults in chat  ');
select public.report_player('92000000-0000-4000-8000-000000000101', '92000000-0000-4000-8000-000000000002', 'abuse', 'Insults in chat');

do $$
begin
  begin
    perform public.report_player(gen_random_uuid(), '92000000-0000-4000-8000-000000000001', 'other', '');
    raise exception 'A player reported themselves';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform 1 from public.player_reports;
    raise exception 'Players can read reports';
  exception when insufficient_privilege then
    null;
  end;

  for i in 1..4 loop
    perform public.report_player(gen_random_uuid(), '92000000-0000-4000-8000-000000000002', 'cheating', '');
  end loop;

  begin
    perform public.report_player(gen_random_uuid(), '92000000-0000-4000-8000-000000000002', 'cheating', '');
    raise exception 'The hourly report limit did not apply';
  exception when sqlstate 'P0001' then
    null;
  end;
end;
$$;

-- A guest cannot report.
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000003', true);

do $$
begin
  perform public.report_player(gen_random_uuid(), '92000000-0000-4000-8000-000000000002', 'abuse', '');
  raise exception 'A guest reported a player';
exception when insufficient_privilege then
  null;
end;
$$;

reset role;

do $$
begin
  if (select count(*) from public.player_reports where reporter = '92000000-0000-4000-8000-000000000001') <> 5 then
    raise exception 'Reports were not recorded once each';
  end if;

  if (select details from public.player_reports where id = '92000000-0000-4000-8000-000000000101') <> 'Insults in chat' then
    raise exception 'Report details were not trimmed';
  end if;
end;
$$;

-- Deleting either account removes its reports.
delete from auth.users where id = '92000000-0000-4000-8000-000000000002';

do $$
begin
  if exists (select 1 from public.player_reports) then
    raise exception 'Reports outlived the reported account';
  end if;
end;
$$;

rollback;
