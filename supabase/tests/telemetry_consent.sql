-- Run against a disposable Supabase database after the migrations. All changes roll back.
begin;
insert into auth.users (id) values
  ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"is_anonymous":false}', true);
set local role authenticated;

do $$
declare
  agreed jsonb;
  first_id text;
  again jsonb;
begin
  if public.my_privacy() is not null then raise exception 'Existing players must start undecided'; end if;
  if public.reserve_telemetry(2, gen_random_uuid(), now()) is not null then
    raise exception 'Unknown consent collected';
  end if;
  perform public.set_privacy(2, false);
  if (public.my_privacy() ->> 'telemetry')::boolean then raise exception 'Refusal was not saved'; end if;
  if public.reserve_telemetry(2, gen_random_uuid(), now()) is not null then
    raise exception 'Refusal collected';
  end if;

  agreed := public.set_privacy(2, true);
  if not (agreed ->> 'telemetry')::boolean then raise exception 'Grant was not saved'; end if;
  again := public.reserve_telemetry(2, '20000000-0000-4000-8000-000000000001', now());
  first_id := again ->> 'analyticsId';
  if first_id is null or first_id = auth.uid()::text then raise exception 'Missing or identifying pseudonym'; end if;
  if public.reserve_telemetry(2, '20000000-0000-4000-8000-000000000001', now()) is not null then
    raise exception 'Duplicate submission accepted';
  end if;
  if public.reserve_telemetry(0, gen_random_uuid(), now()) is not null then
    raise exception 'Old explanation version accepted';
  end if;
  if public.reserve_telemetry(2, gen_random_uuid(), now() - interval '1 hour') is not null then
    raise exception 'Historical submission accepted';
  end if;
  if public.reserve_telemetry(2, gen_random_uuid(), now() + interval '1 hour') is not null then
    raise exception 'Future submission accepted';
  end if;
  if public.set_privacy(2, true) -> 'telemetrySince' <> agreed -> 'telemetrySince' then
    raise exception 'Repeated grant reset timestamp';
  end if;

  perform public.set_privacy(2, false);
  if public.reserve_telemetry(2, gen_random_uuid(), now()) is not null then
    raise exception 'Revoked consent collected';
  end if;
  perform public.set_privacy(2, true);
  again := public.reserve_telemetry(2, '20000000-0000-4000-8000-000000000002', now());
  if again ->> 'analyticsId' = first_id then raise exception 'Deleted pseudonym was reused'; end if;

  if has_table_privilege('authenticated', 'public.telemetry_consent', 'SELECT')
    or has_table_privilege('authenticated', 'public.telemetry_receipts', 'INSERT')
    or has_table_privilege('anon', 'public.telemetry_deletions', 'SELECT')
  then raise exception 'Private table exposed'; end if;
  if has_function_privilege('anon', 'public.my_privacy()', 'EXECUTE')
    or has_function_privilege('anon', 'public.set_privacy(integer,boolean)', 'EXECUTE')
    or has_function_privilege('anon', 'public.reserve_telemetry(integer,uuid,timestamptz)', 'EXECUTE')
  then raise exception 'Anonymous role can execute privacy RPCs'; end if;

  begin
    perform public.set_privacy(3, true);
    raise exception 'Unknown explanation version accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

savepoint quota_test;
do $$
begin
  for i in 1..199 loop
    if public.reserve_telemetry(2, gen_random_uuid(), now()) is null then
      raise exception 'Quota was applied too early';
    end if;
  end loop;
  if public.reserve_telemetry(2, gen_random_uuid(), now()) is not null then
    raise exception 'Per-player quota not enforced';
  end if;
end;
$$;
rollback to quota_test;

-- Guest accounts cannot consent or submit, even though their JWT role is authenticated.
select set_config('request.jwt.claims', '{"is_anonymous":true}', true);
do $$
begin
  if public.my_privacy() is not null or public.reserve_telemetry(2, gen_random_uuid(), now()) is not null then
    raise exception 'Guest can collect or read consent';
  end if;
  begin
    perform public.set_privacy(2, true);
    raise exception 'Guest consent accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- A different account never inherits consent.
select set_config('request.jwt.claims', '{"is_anonymous":false}', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
begin
  if public.my_privacy() is not null or public.reserve_telemetry(2, gen_random_uuid(), now()) is not null then
    raise exception 'Account consent leaked';
  end if;
end;
$$;
reset role;

do $$
begin
  if (select count(*) from public.telemetry_deletions) <> 1 then
    raise exception 'Withdrawal did not queue external erasure';
  end if;
  if (select count(*) from public.telemetry_receipts) <> 1 then
    raise exception 'Old receipts were not removed';
  end if;
  if not (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.telemetry_consent'::regclass, 'public.telemetry_receipts'::regclass,
      'public.telemetry_deletions'::regclass, 'public.telemetry_consent_log'::regclass)) then
    raise exception 'RLS missing';
  end if;
end;
$$;

delete from auth.users where id = '10000000-0000-4000-8000-000000000001';
do $$
begin
  if (select count(*) from public.telemetry_deletions) <> 2 then
    raise exception 'Account deletion did not queue external erasure';
  end if;
  if exists(select 1 from public.telemetry_consent) or exists(select 1 from public.telemetry_receipts)
    or exists(select 1 from public.telemetry_consent_log) then
    raise exception 'Account data did not cascade';
  end if;
end;
$$;
rollback;
