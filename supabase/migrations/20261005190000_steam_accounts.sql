-- Steam sign-in for the desktop game: which account each Steam account belongs to.
-- Only the steam-auth Edge Function reads or writes it, with the service role; players have no access.
create table public.steam_accounts (
  steam_id text primary key check (steam_id ~ '^[0-9]{17}$'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  linked_at timestamptz not null default now()
);

alter table public.steam_accounts enable row level security;

revoke all on table public.steam_accounts from anon, authenticated;
