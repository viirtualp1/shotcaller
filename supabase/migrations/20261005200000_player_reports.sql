-- Reports about other coaches, for moderators to review in Table Editor. Google Play requires apps with chat to let
-- players report users. Players submit through the rate-limited RPC only and never read reports back.
create table public.player_reports (
  id uuid primary key,
  reporter uuid not null references auth.users(id) on delete cascade,
  reported uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('abuse', 'cheating', 'name', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  created_at timestamptz not null default now(),
  check (reporter <> reported)
);

comment on table public.player_reports is 'Player reports about other coaches; readable by project administrators only.';
create index player_reports_inbox on public.player_reports (status, created_at desc);
create index player_reports_by_reporter on public.player_reports (reporter, created_at desc);
create index player_reports_by_reported on public.player_reports (reported, created_at desc);

alter table public.player_reports enable row level security;
revoke all on public.player_reports from anon, authenticated;

create function public.report_player(report_id uuid, player uuid, reason text, details text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or not exists (select 1 from auth.users u where u.id = caller and u.is_anonymous is false) then
    raise exception 'Sign in to report a player' using errcode = '42501';
  end if;

  if player = caller or not exists (select 1 from public.coaches c where c.id = player) then
    raise exception 'Unknown player' using errcode = '22023';
  end if;

  -- Per-player serialization makes quota checks and retries safe under concurrent submissions.
  perform pg_advisory_xact_lock(hashtextextended(caller::text || ':report', 0));

  if exists (select 1 from public.player_reports r where r.id = report_id and r.reporter = caller) then
    return;
  end if;

  if (select count(*) from public.player_reports r
      where r.reporter = caller and r.created_at >= now() - interval '1 hour') >= 5
    or (select count(*) from public.player_reports r
      where r.reporter = caller and r.created_at >= now() - interval '1 day') >= 20
  then
    raise exception 'report_rate_limit' using errcode = 'P0001';
  end if;

  insert into public.player_reports (id, reporter, reported, reason, details)
  values (report_id, caller, player, reason, left(btrim(coalesce(details, '')), 500));
end;
$$;

revoke all on function public.report_player(uuid, uuid, text, text) from public, anon;
grant execute on function public.report_player(uuid, uuid, text, text) to authenticated;

-- Reports reach the same Telegram chat as support requests, through the same Vault secrets.
create function public.notify_player_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
  chat text;
  reporter_name text;
  reported_name text;
  body text;
begin
  select s.decrypted_secret into token from vault.decrypted_secrets s where s.name = 'support_telegram_token';
  select s.decrypted_secret into chat from vault.decrypted_secrets s where s.name = 'support_telegram_chat';

  if token is null or chat is null then
    return new;
  end if;

  select nullif(p.name, '') into reporter_name from public.profiles p where p.id = new.reporter;
  select nullif(p.name, '') into reported_name from public.profiles p where p.id = new.reported;

  body := left(format(
    E'🚩 Report · %s\n%s\n\nReported: %s (%s)\nBy: %s (%s)\n\n%s\n\nID %s',
    new.reason,
    to_char(new.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI "UTC"'),
    coalesce(reported_name, 'unnamed coach'),
    new.reported,
    coalesce(reporter_name, 'unnamed coach'),
    new.reporter,
    coalesce(nullif(new.details, ''), '—'),
    new.id
  ), 4096);

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || token || '/sendMessage',
    body := jsonb_build_object(
      'chat_id', chat,
      'text', body,
      'disable_web_page_preview', true
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  return new;
exception when others then
  raise warning 'Report notification skipped: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.notify_player_report() from public, anon, authenticated;

create trigger player_reports_notify
  after insert on public.player_reports
  for each row execute function public.notify_player_report();
