-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;

insert into auth.users(id, is_anonymous) values
  ('91000000-0000-4000-8000-000000000001', false);
insert into public.steam_accounts(steam_id, user_id) values
  ('76561198000000001', '91000000-0000-4000-8000-000000000001');

do $$
begin
  if has_table_privilege('anon', 'public.steam_accounts', 'SELECT')
    or has_table_privilege('authenticated', 'public.steam_accounts', 'SELECT')
    or has_table_privilege('authenticated', 'public.steam_accounts', 'INSERT')
  then
    raise exception 'Players can reach the Steam links';
  end if;
end;
$$;

-- A Steam account links to one account, and an account to one Steam account.
do $$
begin
  begin
    insert into public.steam_accounts(steam_id, user_id) values
      ('76561198000000002', '91000000-0000-4000-8000-000000000001');
    raise exception 'An account took a second Steam account';
  exception when unique_violation then
    null;
  end;
end;
$$;

-- Deleting the account removes its Steam link.
delete from auth.users where id = '91000000-0000-4000-8000-000000000001';

do $$
begin
  if exists (select 1 from public.steam_accounts where steam_id = '76561198000000001') then
    raise exception 'A deleted account kept its Steam link';
  end if;
end;
$$;

rollback;
