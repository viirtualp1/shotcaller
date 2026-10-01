-- A private feedback inbox for Table Editor. Players can submit through the rate-limited RPC only.
create table public.support_requests (
  id uuid primary key,
  sender uuid references auth.users(id) on delete set null,
  category text not null check (category in ('bug', 'balance', 'idea', 'other')),
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  message text not null check (char_length(btrim(message)) between 20 and 4000),
  reply_email text check (reply_email is null or (
    char_length(reply_email) <= 254 and reply_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )),
  game_version text not null check (char_length(game_version) between 1 and 20),
  language text not null check (language in ('en', 'ru')),
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

comment on table public.support_requests is 'Player-submitted feedback; readable by project administrators only.';
create index support_requests_by_sender on public.support_requests (sender, created_at desc);
create index support_requests_inbox on public.support_requests (status, created_at desc);

alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon, authenticated;

create function public.submit_feedback(
  request_id uuid,
  category text,
  subject text,
  message text,
  reply_email text,
  game_version text,
  language text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  player uuid := auth.uid();
begin
  if player is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;

  -- Per-player serialization makes quota checks and retries safe under concurrent submissions.
  perform pg_advisory_xact_lock(hashtextextended(player::text || ':feedback', 0));

  if exists (select 1 from public.support_requests r where r.id = request_id and r.sender = player) then
    return;
  end if;

  if (select count(*) from public.support_requests r
      where r.sender = player and r.created_at >= now() - interval '1 hour') >= 3
    or (select count(*) from public.support_requests r
      where r.sender = player and r.created_at >= now() - interval '1 day') >= 10
  then
    raise exception 'feedback_rate_limit' using errcode = 'P0001';
  end if;

  insert into public.support_requests (id, sender, category, subject, message, reply_email, game_version, language)
  values (request_id, player, category, btrim(subject), btrim(message), nullif(btrim(reply_email), ''), game_version, language);
end;
$$;

revoke all on function public.submit_feedback(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_feedback(uuid, text, text, text, text, text, text) to authenticated;
