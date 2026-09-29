-- Friend match details.
-- A match from a friend's latest ones opens in full, like one's own: heroes, both lineups and the kept
-- rounds. As in the profile, whether it was a duel is shown, but not who it was against.

create function public.coach_match(friend uuid, match_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select (m - 'duel') || jsonb_build_object('duel', jsonb_typeof(m -> 'duel') = 'object')
  from public.coaches c
  join public.profiles p on p.id = c.id
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(p.data -> 'profile' -> 'recent') = 'array' then p.data -> 'profile' -> 'recent' end
  ) with ordinality as r(m, i)
  where c.id = friend
    and i <= 10
    and m ->> 'id' = match_id
    and public.is_registered()
    and (friend = auth.uid() or public.are_friends(auth.uid(), friend))
  limit 1
$$;

revoke execute on function public.coach_match(uuid, text) from public, anon;
grant execute on function public.coach_match(uuid, text) to authenticated;
