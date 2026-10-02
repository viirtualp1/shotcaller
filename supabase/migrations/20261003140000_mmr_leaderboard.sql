-- A public, bounded leaderboard. Profiles, Auth metadata and friend codes remain private.
create index ratings_by_mode_mmr on public.ratings (mode, rating desc, coach_id);

create function public.mmr_leaderboard(game_mode text)
returns table (
  id uuid,
  "position" bigint,
  name text,
  avatar text,
  photo text,
  rating integer
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
    select c.id, rank() over (order by r.rating desc) as "position", c.name, c.avatar, c.photo, r.rating
    from public.ratings r
    join public.coaches c on c.id = r.coach_id
    join auth.users u on u.id = c.id and u.is_anonymous is false
    where r.mode = game_mode
  )
  select r.id, r."position", r.name, r.avatar, r.photo, r.rating
  from ranked r
  where not public.is_blocked(auth.uid(), r.id)
  order by r.rating desc, r.name, r.id
  limit 100;
end;
$$;

revoke execute on function public.mmr_leaderboard(text) from public;
grant execute on function public.mmr_leaderboard(text) to anon, authenticated;

-- Reuse friend-request rules without returning the target's private friend code to the client.
create function public.request_leaderboard_friend(other uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text;
begin
  if not public.is_registered() then
    raise exception 'Friends need an email or Google account' using errcode = '42501';
  end if;

  select c.friend_code into code
  from public.coaches c
  join auth.users u on u.id = c.id and u.is_anonymous is false
  where c.id = other and exists (select 1 from public.ratings r where r.coach_id = c.id);

  if code is null then
    return 'notFound';
  end if;

  return public.request_friend(code);
end;
$$;

revoke execute on function public.request_leaderboard_friend(uuid) from public, anon;
grant execute on function public.request_leaderboard_friend(uuid) to authenticated;
