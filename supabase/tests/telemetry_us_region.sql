-- Current functions must reject an old grant even if a legacy client left it enabled.
begin;
insert into auth.users(id) values ('60000000-0000-4000-8000-000000000001');
insert into public.telemetry_consent(user_id, version, enabled, enabled_since, analytics_id)
values ('60000000-0000-4000-8000-000000000001', 1, true, now() - interval '1 hour',
  '60000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"is_anonymous":false}', true);
set local role authenticated;

do $$
declare
  choice jsonb;
  reservation jsonb;
begin
  if public.reserve_telemetry(1, gen_random_uuid(), now()) is not null
    or public.reserve_telemetry(2, gen_random_uuid(), now()) is not null
  then
    raise exception 'Previous region policy was accepted';
  end if;

  begin
    perform public.set_privacy(1, true);
    raise exception 'Outdated explanation saved';
  exception when invalid_parameter_value then
    null;
  end;

  choice := public.set_privacy(2, true);
  reservation := public.reserve_telemetry(2, gen_random_uuid(), now());
  if choice ->> 'version' <> '2' or choice ->> 'telemetry' <> 'true'
    or reservation ->> 'analyticsId' is null
    or reservation ->> 'analyticsId' = '60000000-0000-4000-8000-000000000002'
  then
    raise exception 'Reviewing current policy did not rotate the identifier and enable new matches';
  end if;
end;
$$;

reset role;
do $$
begin
  if not exists (select 1 from public.telemetry_deletions where analytics_id = '60000000-0000-4000-8000-000000000002') then
    raise exception 'Previous region analytics were not queued for erasure';
  end if;
end;
$$;
rollback;
