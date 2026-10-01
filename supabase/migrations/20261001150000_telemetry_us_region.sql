-- Correct the disclosed provider region to US. Existing EU-policy choices must be reviewed again.
-- Pause old grants and queue their analytics for erasure; never infer a new grant.
begin;

insert into public.telemetry_deletions (analytics_id)
  select analytics_id from public.telemetry_consent where version < 2 and enabled
  on conflict do nothing;

delete from public.telemetry_receipts r using public.telemetry_consent c
  where r.user_id = c.user_id and c.version < 2;

update public.telemetry_consent set enabled = false, enabled_since = null, updated_at = now()
  where version < 2;

create or replace function public.set_privacy(policy_version integer, allow_telemetry boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  previous public.telemetry_consent;
  next_id uuid;
begin
  if not public.is_registered() then
    raise exception 'A registered account is required' using errcode = '42501';
  end if;

  if policy_version is distinct from 2 or allow_telemetry is null then
    raise exception 'Review the current telemetry explanation' using errcode = '22023';
  end if;

  -- Serialize first-time saves too, not just updates of an existing row.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
  select * into previous from public.telemetry_consent where user_id = auth.uid() for update;
  next_id := case when previous.enabled and previous.version = policy_version
    then previous.analytics_id else gen_random_uuid() end;

  if previous.enabled and (not allow_telemetry or previous.version <> policy_version) then
    insert into public.telemetry_deletions (analytics_id) values (previous.analytics_id)
      on conflict do nothing;
    delete from public.telemetry_receipts where user_id = auth.uid();
  end if;

  insert into public.telemetry_consent as c
    (user_id, version, enabled, enabled_since, analytics_id)
  values (auth.uid(), policy_version, allow_telemetry,
    case when allow_telemetry then now() end, next_id)
  on conflict (user_id) do update set version = excluded.version, enabled = excluded.enabled,
    enabled_since = case when c.enabled and c.version = excluded.version and excluded.enabled
      then c.enabled_since else excluded.enabled_since end,
    analytics_id = excluded.analytics_id, updated_at = now();

  insert into public.telemetry_consent_log (user_id, version, enabled)
    values (auth.uid(), policy_version, allow_telemetry);
  return public.my_privacy();
end;
$$;

create or replace function public.reserve_telemetry(policy_version integer, match_id uuid, finished_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  consent public.telemetry_consent;
  receipt uuid;
begin
  if not public.is_registered() then
    return null;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
  select * into consent from public.telemetry_consent where user_id = auth.uid() for update;
  if consent.enabled is distinct from true or consent.version <> 2
    or policy_version is distinct from 2 or finished_at is null
    or finished_at < consent.enabled_since
    or finished_at < now() - interval '5 minutes' or finished_at > now() + interval '1 minute'
  then
    return null;
  end if;

  if (select count(*) from public.telemetry_receipts
      where user_id = auth.uid() and created_at > now() - interval '1 day') >= 200
  then
    return null;
  end if;

  insert into public.telemetry_receipts (user_id, match_id)
    values (auth.uid(), match_id) on conflict do nothing returning event_id into receipt;
  if receipt is null then
    return null;
  end if;

  return jsonb_build_object('analyticsId', consent.analytics_id, 'eventId', receipt);
end;
$$;

commit;
