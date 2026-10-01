-- Optional PostHog analytics, separate from cloud saves, friends and rating settlement.
-- No existing account is opted in and no cloud history is backfilled.
create table public.telemetry_consent (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version integer not null,
  enabled boolean not null default false,
  enabled_since timestamptz,
  analytics_id uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

create table public.telemetry_consent_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  enabled boolean not null,
  recorded_at timestamptz not null default now()
);

-- Contains deduplication receipts only, never gameplay payloads.
create table public.telemetry_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null,
  event_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

-- Survives account deletion so external analytics can be erased too.
create table public.telemetry_deletions (
  analytics_id uuid primary key,
  ready_at timestamptz not null default now() + interval '2 minutes',
  requested_at timestamptz not null default now()
);

alter table public.telemetry_consent enable row level security;
alter table public.telemetry_consent_log enable row level security;
alter table public.telemetry_receipts enable row level security;
alter table public.telemetry_deletions enable row level security;
revoke all on public.telemetry_consent, public.telemetry_consent_log,
  public.telemetry_receipts, public.telemetry_deletions from anon, authenticated;
grant all on public.telemetry_consent, public.telemetry_consent_log,
  public.telemetry_receipts, public.telemetry_deletions to service_role;

create function public.my_privacy()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('version', version, 'telemetry', enabled,
    'telemetrySince', enabled_since)
  from public.telemetry_consent
  where user_id = auth.uid() and public.is_registered()
$$;

create function public.set_privacy(policy_version integer, allow_telemetry boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  previous public.telemetry_consent;
  next_id uuid;
begin
  if not public.is_registered() then
    raise exception 'A registered account is required' using errcode = '42501';
  end if;
  if policy_version is distinct from 1 or allow_telemetry is null then
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

-- Runs with the player's JWT. The Edge Function cannot reserve data for anyone else.
create function public.reserve_telemetry(policy_version integer, match_id uuid, finished_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  consent public.telemetry_consent;
  receipt uuid;
begin
  if not public.is_registered() then return null; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
  select * into consent from public.telemetry_consent where user_id = auth.uid() for update;
  if consent.enabled is distinct from true or consent.version <> 1
    or policy_version is distinct from 1 or finished_at is null
    or finished_at < consent.enabled_since
    or finished_at < now() - interval '5 minutes' or finished_at > now() + interval '1 minute'
  then return null; end if;
  if (select count(*) from public.telemetry_receipts
      where user_id = auth.uid() and created_at > now() - interval '1 day') >= 200
  then return null; end if;

  insert into public.telemetry_receipts (user_id, match_id)
    values (auth.uid(), match_id) on conflict do nothing returning event_id into receipt;
  if receipt is null then return null; end if;
  return jsonb_build_object('analyticsId', consent.analytics_id, 'eventId', receipt);
end;
$$;

create function public.queue_telemetry_account_deletion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.telemetry_deletions (analytics_id) values (old.analytics_id)
    on conflict do nothing;
  return old;
end;
$$;
create trigger queue_telemetry_account_deletion before delete on public.telemetry_consent
  for each row execute function public.queue_telemetry_account_deletion();

revoke execute on function public.my_privacy(), public.set_privacy(integer, boolean),
  public.reserve_telemetry(integer, uuid, timestamptz), public.queue_telemetry_account_deletion()
  from public, anon, authenticated;
grant execute on function public.my_privacy(), public.set_privacy(integer, boolean),
  public.reserve_telemetry(integer, uuid, timestamptz) to authenticated;
