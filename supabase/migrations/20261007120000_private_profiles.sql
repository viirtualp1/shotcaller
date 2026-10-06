-- Profiles start private. The first dossier migration went out with open profiles and a leaderboard that did not say
-- whose profile is open; this closes every profile until its coach turns it on and adds that flag to the leaderboard.

alter table public.coaches alter column public_profile set default false;

update public.coaches set public_profile = false where public_profile;

create or replace function public.my_public_profile()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.public_profile from public.coaches c where c.id = auth.uid()), false)
$$;

create or replace function public.set_public_profile(visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_registered() then
    raise exception 'A profile needs an email or Google account' using errcode = '42501';
  end if;

  update public.coaches set public_profile = coalesce(visible, false) where id = auth.uid();
end;
$$;

revoke execute on function public.my_public_profile(), public.set_public_profile(boolean) from public, anon;
grant execute on function public.my_public_profile(), public.set_public_profile(boolean) to authenticated;

-- The leaderboard says whose dossier is open, so a private profile is shown as such instead of failing on a click.
drop function public.mmr_leaderboard(text);

create function public.mmr_leaderboard(game_mode text)
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
