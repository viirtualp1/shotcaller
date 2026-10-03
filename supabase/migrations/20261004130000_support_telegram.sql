-- Forwards every new support request to a Telegram chat. The bot token and chat ID live in Supabase Vault:
--   select vault.create_secret('<bot token>', 'support_telegram_token');
--   select vault.create_secret('<chat id>', 'support_telegram_chat');
-- Without both secrets nothing is sent. A failed notification never blocks the player's submission.
create extension if not exists pg_net;

create function public.notify_support_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
  chat text;
  coach text;
  body text;
begin
  select s.decrypted_secret into token from vault.decrypted_secrets s where s.name = 'support_telegram_token';
  select s.decrypted_secret into chat from vault.decrypted_secrets s where s.name = 'support_telegram_chat';

  if token is null or chat is null then
    return new;
  end if;

  select nullif(p.name, '') into coach from public.profiles p where p.id = new.sender;

  -- Plain text needs no escaping; Telegram rejects messages over 4096 characters.
  body := left(format(
    E'%s %s\n%s\n\n%s\n\nFrom: %s\nReply to: %s\nVersion %s · %s\nID %s',
    case new.category
      when 'bug' then '🐞 Bug'
      when 'balance' then '⚖️ Balance'
      when 'idea' then '💡 Idea'
      else '✉️ Other'
    end,
    to_char(new.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI "UTC"'),
    new.subject,
    left(new.message, 3500),
    coalesce(coach, 'unnamed coach') || ' (' || coalesce(new.sender::text, 'deleted account') || ')',
    coalesce(new.reply_email, '—'),
    new.game_version,
    upper(new.language),
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
  raise warning 'Support notification skipped: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.notify_support_request() from public, anon, authenticated;

create trigger support_requests_notify
  after insert on public.support_requests
  for each row execute function public.notify_support_request();
