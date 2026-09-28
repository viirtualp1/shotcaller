-- Friend profiles.
-- A coach can look at a friend's rank, totals and latest matches. Only those public parts of the saved
-- profile are handed out, only between friends, and never to guests.

create function public.coach_profile(friend uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'avatar', c.avatar,
    'rating', c.rating,
    'peakRating', coalesce(p.data -> 'profile' -> 'peakRating', to_jsonb(c.rating)),
    'xp', coalesce(p.data -> 'profile' -> 'xp', to_jsonb(0)),
    'totals', p.data -> 'profile' -> 'totals',
    'recent', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', m -> 'id',
            'playedAt', m -> 'playedAt',
            'difficulty', m -> 'difficulty',
            'xp', m -> 'xp',
            'verdict', m -> 'verdict',
            'reason', m -> 'reason',
            'rounds', m -> 'rounds',
            'roundsWon', m -> 'roundsWon',
            'roundsLost', m -> 'roundsLost',
            'lineup', m -> 'lineup',
            'mvp', m -> 'mvp',
            'ratingBefore', m -> 'ratingBefore',
            'ratingAfter', m -> 'ratingAfter'
          )
          order by i
        )
        from jsonb_array_elements(
          case when jsonb_typeof(p.data -> 'profile' -> 'recent') = 'array' then p.data -> 'profile' -> 'recent' end
        ) with ordinality as r(m, i)
        where i <= 10
      ),
      '[]'::jsonb
    )
  )
  from public.coaches c
  left join public.profiles p on p.id = c.id
  where c.id = friend
    and public.is_registered()
    and (friend = auth.uid() or public.are_friends(auth.uid(), friend))
$$;

revoke execute on function public.coach_profile(uuid) from public, anon;
grant execute on function public.coach_profile(uuid) to authenticated;
