-- A registered coach can permanently erase their own account and all its dependent rows.
-- Authentication/session rows and game tables already cascade from auth.users/coaches.
create function public.delete_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or not exists (
    select 1 from auth.users where id = caller and is_anonymous is false
  ) then
    raise exception 'Sign in to delete your account' using errcode = '42501';
  end if;

  -- Support requests use SET NULL rather than CASCADE; erase their text and reply address too.
  delete from public.support_requests where sender = caller;
  delete from auth.users where id = caller;
  -- The existing consent trigger queues erasure of external analytics using an anonymous ID.
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
