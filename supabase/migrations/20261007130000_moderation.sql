-- Moderation for player reports.
-- A report now keeps its evidence as it was when sent: the reported coach's name and photo, the last messages between
-- the two and the reported coach's latest matches, so a renamed coach or a chat removed with the friendship can still
-- be judged. Moderators act from the SQL editor (the Telegram message carries the commands): a sanction mutes a coach's
-- chat, hides their name and photo or takes them off the leaderboard. Three trusted reporters in a week mute or hide a
-- coach on their own until a moderator decides. Reports rejected as false count against the reporter, who loses the
-- right to report after three of them.

-- Sanctions -------------------------------------------------------------------------------------------------------

create table public.sanctions (
  id bigint generated always as identity primary key,
  coach uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('chat', 'name', 'leaderboard', 'reports')),
  -- Null keeps it until a moderator lifts it.
  until timestamptz,
  -- Set by the report thresholds rather than by a moderator; a moderator's decision replaces it.
  auto boolean not null default false,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  lifted_at timestamptz
);

comment on table public.sanctions is 'Restrictions on coaches from moderation; readable by project administrators only.';
create index sanctions_active on public.sanctions (coach, kind) where lifted_at is null;

alter table public.sanctions enable row level security;
revoke all on public.sanctions from anon, authenticated;

create function public.has_sanction(target uuid, sanction text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sanctions s
    where s.coach = target
      and s.kind = sanction
      and s.lifted_at is null
      and (s.until is null or s.until > now())
  )
$$;

-- A hidden name and photo leave the coach as the default "Coach" everywhere others see them.
create function public.apply_sanction(target uuid, sanction text, ends timestamptz, automatic boolean, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.sanctions (coach, kind, until, auto, note)
  values (target, sanction, ends, automatic, left(coalesce(reason, ''), 500));

  if sanction = 'name' then
    update public.coaches set name = '', photo = null, updated_at = now() where id = target;
  end if;
end;
$$;

-- The coach's own name comes back once nothing hides it any more; the photo waits until they choose it again.
create function public.restore_name(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.has_sanction(target, 'name') then
    return;
  end if;

  update public.coaches c
  set name = public.clean_name(p.name), updated_at = now()
  from public.profiles p
  where p.id = c.id and c.id = target and c.name is distinct from public.clean_name(p.name);
end;
$$;

create function public.lift_sanctions(target uuid, sanction text, only_auto boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  lifted integer;
begin
  update public.sanctions s
  set lifted_at = now()
  where s.coach = target
    and s.kind = sanction
    and s.lifted_at is null
    and (s.until is null or s.until > now())
    and (s.auto or not only_auto);

  get diagnostics lifted = row_count;

  if sanction = 'name' then
    perform public.restore_name(target);
  end if;

  return lifted;
end;
$$;

-- Run by pg_cron: names hidden for a while come back when their time is up.
create function public.expire_sanctions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  for target in
    update public.sanctions s
    set lifted_at = s.until
    where s.lifted_at is null and s.until <= now()
    returning s.coach
  loop
    perform public.restore_name(target);
  end loop;
end;
$$;

revoke execute on function
  public.has_sanction(uuid, text),
  public.apply_sanction(uuid, text, timestamptz, boolean, text),
  public.restore_name(uuid),
  public.lift_sanctions(uuid, text, boolean),
  public.expire_sanctions()
from public, anon, authenticated;

-- Reports ---------------------------------------------------------------------------------------------------------

alter table public.player_reports
  add column evidence jsonb not null default '{}'::jsonb check (pg_column_size(evidence) <= 32768),
  add column resolved_at timestamptz;

alter table public.player_reports drop constraint player_reports_status_check;
alter table public.player_reports
  add constraint player_reports_status_check
  check (status in ('new', 'reviewed', 'closed', 'confirmed', 'rejected'));

create index player_reports_rejected on public.player_reports (reporter, resolved_at desc) where status = 'rejected';

-- Reporters with a record of false reports, or accounts made days ago, do not move the thresholds.
create function public.trusted_reporter(reporter uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users u where u.id = reporter and u.created_at <= now() - interval '3 days')
    and not public.has_sanction(reporter, 'reports')
    and (
      select count(*)
      from public.player_reports r
      where r.reporter = trusted_reporter.reporter
        and r.status = 'rejected'
        and r.resolved_at >= now() - interval '90 days'
    ) < 3
$$;

revoke execute on function public.trusted_reporter(uuid) from public, anon, authenticated;

create or replace function public.report_player(report_id uuid, player uuid, reason text, details text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  proof jsonb;
  -- Abuse in chat mutes the chat; an offensive name or picture hides both. Other reasons wait for a moderator.
  sanction text := case report_player.reason when 'abuse' then 'chat' when 'name' then 'name' end;
  votes integer;
begin
  if caller is null or not exists (select 1 from auth.users u where u.id = caller and u.is_anonymous is false) then
    raise exception 'Sign in to report a player' using errcode = '42501';
  end if;

  if player = caller or not exists (select 1 from public.coaches c where c.id = player) then
    raise exception 'Unknown player' using errcode = '22023';
  end if;

  if public.has_sanction(caller, 'reports') then
    raise exception 'reports_restricted' using errcode = 'P0403';
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

  select jsonb_build_object(
    'name', c.name,
    'photo', c.photo,
    'chat', coalesce((
      select jsonb_agg(jsonb_build_object(
        'from', case when m.sender = player then 'reported' else 'reporter' end,
        'body', m.body,
        'at', m.created_at
      ) order by m.id)
      from (
        select k.id, k.sender, k.body, k.created_at
        from public.messages k
        where (k.sender = caller and k.recipient = player) or (k.sender = player and k.recipient = caller)
        order by k.id desc
        limit 30
      ) m
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id,
        'at', x.played_at,
        'verdict', x.verdict,
        'mode', x.data ->> 'mode'
      ) order by x.played_at desc)
      from (
        select k.id, k.played_at, k.verdict, k.data
        from public.matches k
        where k.user_id = player
        order by k.played_at desc
        limit 5
      ) x
    ), '[]'::jsonb),
    'ratings', coalesce((
      select jsonb_object_agg(r.mode, r.rating) from public.ratings r where r.coach_id = player
    ), '{}'::jsonb),
    'reporter', jsonb_build_object(
      'since', (select u.created_at from auth.users u where u.id = caller),
      'sent', (select count(*) from public.player_reports r
        where r.reporter = caller and r.created_at >= now() - interval '90 days'),
      'rejected', (select count(*) from public.player_reports r
        where r.reporter = caller and r.status = 'rejected' and r.resolved_at >= now() - interval '90 days'),
      'trusted', public.trusted_reporter(caller)
    )
  )
  into proof
  from public.coaches c
  where c.id = player;

  insert into public.player_reports (id, reporter, reported, reason, details, evidence)
  values (report_id, caller, player, reason, left(btrim(coalesce(details, '')), 500), proof);

  if sanction is null or public.has_sanction(player, sanction) then
    return;
  end if;

  select count(distinct r.reporter)
  into votes
  from public.player_reports r
  where r.reported = player
    and r.reason = report_player.reason
    and r.status = 'new'
    and r.created_at >= now() - interval '7 days'
    and public.trusted_reporter(r.reporter);

  if votes >= 3 then
    perform public.apply_sanction(
      player,
      sanction,
      now() + case sanction when 'chat' then interval '3 days' else interval '7 days' end,
      true,
      format('%s trusted reports in a week', votes)
    );

    update public.player_reports
    set evidence = evidence || jsonb_build_object('auto', sanction)
    where id = report_id;
  end if;
end;
$$;

revoke all on function public.report_player(uuid, uuid, text, text) from public, anon;
grant execute on function public.report_player(uuid, uuid, text, text) to authenticated;

-- What a moderator acts on, from the SQL editor: run as `postgres`, never granted to players. -----------------------

-- Everything about one coach in one place: who they are now, open reports with evidence, and past sanctions.
create function public.player_moderation(player uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', c.name,
    'profile_name', p.name,
    'photo', c.photo,
    'since', u.created_at,
    'ratings', coalesce((select jsonb_object_agg(r.mode, r.rating) from public.ratings r where r.coach_id = player),
      '{}'::jsonb),
    'open_reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'reason', r.reason,
        'details', r.details,
        'reporter', r.reporter,
        'at', r.created_at,
        'evidence', r.evidence
      ) order by r.created_at desc)
      from public.player_reports r
      where r.reported = player and r.status = 'new'
    ), '[]'::jsonb),
    'confirmed_reports', (select count(*) from public.player_reports r where r.reported = player and r.status = 'confirmed'),
    'sanctions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', s.kind,
        'until', s.until,
        'auto', s.auto,
        'note', s.note,
        'at', s.created_at,
        'lifted', s.lifted_at
      ) order by s.created_at desc)
      from public.sanctions s
      where s.coach = player
    ), '[]'::jsonb),
    'reports_sent', (select count(*) from public.player_reports r where r.reporter = player),
    'reports_rejected', (select count(*) from public.player_reports r where r.reporter = player and r.status = 'rejected')
  )
  from public.coaches c
  left join public.profiles p on p.id = c.id
  left join auth.users u on u.id = c.id
  where c.id = player
$$;

-- Confirms the open reports about a coach and, unless `sanction` is null (a warning only), restricts them for `days`
-- days, or until lifted when `days` is null. Replaces an automatic sanction of the same kind.
create function public.moderate_player(player uuid, sanction text, days integer default 7, note text default '')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmed integer;
begin
  if sanction is not null and sanction not in ('chat', 'name', 'leaderboard', 'reports') then
    raise exception 'A sanction is chat, name, leaderboard or reports' using errcode = '22023';
  end if;

  if not exists (select 1 from public.coaches c where c.id = player) then
    raise exception 'Unknown player' using errcode = '22023';
  end if;

  update public.player_reports r
  set status = 'confirmed', resolved_at = now()
  where r.reported = player and r.status = 'new';

  get diagnostics confirmed = row_count;

  if sanction is null then
    return format('%s report(s) confirmed, no sanction', confirmed);
  end if;

  perform public.lift_sanctions(player, sanction, true);
  perform public.apply_sanction(
    player,
    sanction,
    case when days is null or days <= 0 then null else now() + make_interval(days => days) end,
    false,
    note
  );

  return format(
    '%s report(s) confirmed; %s %s',
    confirmed,
    sanction,
    case when days is null or days <= 0 then 'until lifted' else format('for %s day(s)', days) end
  );
end;
$$;

-- Rejects the open reports about a coach and lifts what the thresholds put on them. A reporter with three rejected
-- reports in 90 days cannot report for 30 days.
create function public.reject_reports(player uuid, note text default '')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  rejected integer;
  senders uuid[];
  restricted integer := 0;
  sender uuid;
begin
  with done as (
    update public.player_reports r
    set status = 'rejected', resolved_at = now()
    where r.reported = player and r.status = 'new'
    returning r.reporter
  )
  select count(*), coalesce(array_agg(distinct done.reporter), '{}') into rejected, senders from done;

  perform public.lift_sanctions(player, 'chat', true);
  perform public.lift_sanctions(player, 'name', true);

  foreach sender in array senders loop
    if not public.has_sanction(sender, 'reports')
      and (
        select count(*)
        from public.player_reports q
        where q.reporter = sender and q.status = 'rejected' and q.resolved_at >= now() - interval '90 days'
      ) >= 3
    then
      perform public.apply_sanction(sender, 'reports', now() + interval '30 days', true,
        coalesce(nullif(note, ''), 'Three rejected reports in 90 days'));
      restricted := restricted + 1;
    end if;
  end loop;

  return format('%s report(s) rejected; %s reporter(s) can no longer report', rejected, restricted);
end;
$$;

create function public.lift_sanction(player uuid, sanction text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  return format('%s %s sanction(s) lifted', public.lift_sanctions(player, sanction, false), sanction);
end;
$$;

revoke execute on function
  public.player_moderation(uuid),
  public.moderate_player(uuid, text, integer, text),
  public.reject_reports(uuid, text),
  public.lift_sanction(uuid, text)
from public, anon, authenticated;

-- Where sanctions take effect --------------------------------------------------------------------------------------

create or replace function public.send_message(friend uuid, message text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := auth.uid();
  clean text;
  sent public.messages;
begin
  if not public.is_registered() then
    raise exception 'Chat needs an email or Google account' using errcode = '42501';
  end if;

  if not public.are_friends(me, friend) then
    raise exception 'Only friends can write to each other' using errcode = '42501';
  end if;

  if public.has_sanction(me, 'chat') then
    raise exception 'chat_muted' using errcode = 'P0403';
  end if;

  clean := public.clean_text(message);

  if char_length(clean) not between 1 and 500 then
    raise exception 'A message is 1 to 500 characters' using errcode = '22023';
  end if;

  if (select count(*) from public.messages m where m.sender = me and m.created_at > now() - interval '10 seconds') >= 8
     or (select count(*) from public.messages m where m.sender = me and m.created_at > now() - interval '1 hour') >= 300
  then
    raise exception 'Too many messages; slow down' using errcode = 'P0429';
  end if;

  insert into public.messages (sender, recipient, body)
  values (me, friend, clean)
  returning * into sent;

  delete from public.messages m
  where m.id in (
    select k.id
    from public.messages k
    where least(k.sender, k.recipient) = least(me, friend)
      and greatest(k.sender, k.recipient) = greatest(me, friend)
    order by k.id desc
    offset 200
  );

  return sent;
end;
$$;

create or replace function public.profiles_sync_coach()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shown constant text := case when public.has_sanction(new.id, 'name') then '' else public.clean_name(new.name) end;
begin
  update public.coaches
  set name = shown, avatar = new.avatar, updated_at = now()
  where id = new.id
    and (name, avatar) is distinct from (shown, new.avatar);

  return new;
end;
$$;

create or replace function public.set_coach_photo(url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := (public.ensure_coach()).id;
  chosen text := null;
begin
  if url is not null and not public.has_sanction(me, 'name') then
    select nullif(coalesce(i.identity_data ->> 'avatar_url', i.identity_data ->> 'picture'), '')
    into chosen
    from auth.identities i
    where i.user_id = me and i.provider = 'google'
    order by i.updated_at desc nulls last
    limit 1;

    if char_length(chosen) > 2048 or chosen !~ '^https://[a-z0-9-]+\.googleusercontent\.com/[^[:space:]]+$' then
      chosen := null;
    end if;
  end if;

  update public.coaches
  set photo = chosen, updated_at = now()
  where id = me and photo is distinct from chosen;
end;
$$;

create or replace function public.is_public_coach(coach uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.coaches c
    join auth.users u on u.id = c.id and u.is_anonymous is false
    where c.id = coach
      and c.public_profile
      and exists (select 1 from public.ratings r where r.coach_id = c.id)
  )
  and not public.is_blocked(auth.uid(), coach)
  and not public.has_sanction(coach, 'leaderboard')
$$;

revoke execute on function public.is_public_coach(uuid) from public, anon, authenticated;

create or replace function public.mmr_leaderboard(game_mode text)
returns table (
  id uuid,
  "position" bigint,
  name text,
  avatar text,
  photo text,
  rating integer,
  open boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if game_mode is null or game_mode not in ('threeLanes', 'twoLanes', 'oneLane') then
    raise exception 'Unknown game mode' using errcode = '22023';
  end if;

  return query
  with ranked as (
    select
      c.id,
      row_number() over (order by r.rating desc, c.name, c.id) as "position",
      c.name,
      c.avatar,
      c.photo,
      r.rating,
      c.public_profile as open
    from public.ratings r
    join public.coaches c on c.id = r.coach_id
    join auth.users u on u.id = c.id and u.is_anonymous is false
    where r.mode = game_mode
      and not public.has_sanction(c.id, 'leaderboard')
  )
  select r.id, r."position", r.name, r.avatar, r.photo, r.rating, r.open
  from ranked r
  where not public.is_blocked(auth.uid(), r.id)
  order by r."position"
  limit 100;
end;
$$;

revoke execute on function public.mmr_leaderboard(text) from public;
grant execute on function public.mmr_leaderboard(text) to anon, authenticated;

-- The Telegram message ---------------------------------------------------------------------------------------------

-- Sent when the transaction commits, so it shows a sanction the thresholds put on the coach in the same call.
create or replace function public.notify_player_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
  chat text;
  report public.player_reports;
  reporter_name text;
  reported_name text;
  conversation text;
  played text;
  body text;
begin
  select s.decrypted_secret into token from vault.decrypted_secrets s where s.name = 'support_telegram_token';
  select s.decrypted_secret into chat from vault.decrypted_secrets s where s.name = 'support_telegram_chat';

  if token is null or chat is null then
    return new;
  end if;

  select * into report from public.player_reports r where r.id = new.id;

  if not found then
    return new;
  end if;

  select nullif(c.name, '') into reporter_name from public.coaches c where c.id = report.reporter;
  reported_name := nullif(report.evidence ->> 'name', '');

  select string_agg(
    format('%s: %s', case m ->> 'from' when 'reported' then '⚠ them' else 'reporter' end, left(m ->> 'body', 200)),
    E'\n'
  )
  into conversation
  from (
    select value as m
    from jsonb_array_elements(report.evidence -> 'chat') with ordinality as e(value, n)
    order by n desc
    limit 10
  ) recent;

  select string_agg(format('%s %s %s', left(x ->> 'at', 10), x ->> 'mode', x ->> 'verdict'), E'\n')
  into played
  from jsonb_array_elements(report.evidence -> 'matches') as x;

  body := left(format(
    E'🚩 Report · %s\n%s\n\nReported: %s (%s)\nBy: %s (%s)\nReporter: %s sent, %s rejected in 90 days%s\n\n%s%s%s%s\n\n'
    || E'Review:\nselect public.player_moderation(''%s'');\n'
    || E'Act (chat | name | leaderboard, days):\nselect public.moderate_player(''%s'', ''chat'', 7);\n'
    || E'False report:\nselect public.reject_reports(''%s'');\n\nID %s',
    report.reason,
    to_char(report.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI "UTC"'),
    coalesce(reported_name, 'unnamed coach'),
    report.reported,
    coalesce(reporter_name, 'unnamed coach'),
    report.reporter,
    coalesce(report.evidence #>> '{reporter,sent}', '0'),
    coalesce(report.evidence #>> '{reporter,rejected}', '0'),
    case when report.evidence #>> '{reporter,trusted}' = 'false' then ' · not counted for thresholds' else '' end,
    coalesce(nullif(report.details, ''), '—'),
    case when report.evidence ? 'auto'
      then format(E'\n\n🔒 Automatic: %s restricted after reports from 3 coaches', report.evidence ->> 'auto')
      else '' end,
    case when conversation is not null then E'\n\nLast messages (newest first):\n' || conversation else '' end,
    case when report.reason = 'cheating' and played is not null then E'\n\nLatest matches:\n' || played else '' end,
    report.reported,
    report.reported,
    report.reported,
    report.id
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

drop trigger player_reports_notify on public.player_reports;

create constraint trigger player_reports_notify
  after insert on public.player_reports
  deferrable initially deferred
  for each row execute function public.notify_player_report();

-- Hidden names come back on time even for a coach who never saves again.
do $$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-sanctions', '*/15 * * * *', 'select public.expire_sanctions()');
  else
    raise notice 'pg_cron is not available: schedule public.expire_sanctions()';
  end if;
end;
$$;
