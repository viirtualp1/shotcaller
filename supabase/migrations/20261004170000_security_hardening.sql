-- Security hardening after the 9.1 database lints.
--
-- 1. New tables and sequences in `public` are private by default. Supabase grants them to `anon` and
--    `authenticated` out of the box, so a migration that forgot a `revoke` exposed its table through the API.
--    Functions keep the explicit revoke/grant every migration already does; supabase/tests/security_hardening.sql
--    fails when a SECURITY DEFINER function becomes callable without being on its list.
-- 2. Trigger functions cannot be called through the API at all.
-- 3. A coach photo is copied only from the Google sign-in itself. `user_metadata` is writable by its own user
--    (`auth.updateUser`), so an address read from it could point friends' devices at any server.
-- 4. Guest (anonymous) accounts never see social rows, even if a later policy forgets to exclude them.

-- 1. Private by default.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

-- 2. Triggers still fire: the execute right is checked only when a trigger is created.
do $$
declare
  trigger_function regprocedure;
begin
  for trigger_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', trigger_function);
  end loop;
end;
$$;

-- 3. Only Google's own picture host, taken from the identity Supabase Auth stored at sign-in.
update public.coaches
set photo = null, updated_at = now()
where photo is not null and photo !~ '^https://[a-z0-9-]+\.googleusercontent\.com/[^[:space:]]+$';

alter table public.coaches
  drop constraint if exists coaches_photo_check,
  add constraint coaches_photo_check check (
    photo is null or (char_length(photo) <= 2048 and photo ~ '^https://[a-z0-9-]+\.googleusercontent\.com/[^[:space:]]+$')
  );

-- A passed address only asks for the picture to be shown; the address itself always comes from the server.
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
  if url is not null then
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

revoke execute on function public.set_coach_photo(text) from public, anon;
grant execute on function public.set_coach_photo(text) to authenticated;

-- 4. Restrictive policies are combined with AND, so they hold whatever permissive policies say.
create policy "Guests see no friendships"
on public.friendships as restrictive for select to authenticated
using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "Guests see no messages"
on public.messages as restrictive for select to authenticated
using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "Guests see no duels"
on public.duels as restrictive for select to authenticated
using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "Guests see no duel boards"
on public.duel_boards as restrictive for select to authenticated
using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
