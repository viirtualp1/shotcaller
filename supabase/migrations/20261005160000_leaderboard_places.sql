-- Places count down the list. Tied ratings no longer share one number.
create or replace function public.mmr_leaderboard(game_mode text)
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
    select
      c.id,
      row_number() over (order by r.rating desc, c.name, c.id) as "position",
      c.name,
      c.avatar,
      c.photo,
      r.rating
    from public.ratings r
    join public.coaches c on c.id = r.coach_id
    join auth.users u on u.id = c.id and u.is_anonymous is false
    where r.mode = game_mode
  )
  select r.id, r."position", r.name, r.avatar, r.photo, r.rating
  from ranked r
  where not public.is_blocked(auth.uid(), r.id)
  order by r."position"
  limit 100;
end;
$$;
