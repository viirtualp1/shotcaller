-- Coach dossiers.
-- A profile now shows how a coach plays, not only how much: the heroes they field and win with, their synergies, and
-- the lanes and items of their latest lineups. Friends see it as before. A ranked coach's open profile can be looked
-- up from the leaderboard by anyone (20261007120000_private_profiles makes profiles start private). Chat, presence, friend codes and duel opponents stay
-- out of it.

alter table public.coaches add column public_profile boolean not null default true;

comment on column public.coaches.public_profile is
  'Whether coaches who are not friends can open this coach''s dossier from the leaderboard.';

-- The dossier itself. Callers below decide who may read it; it is never granted directly.
create function public.coach_dossier(coach uuid)
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
    'photo', case when public.is_registered() and (c.id = auth.uid() or public.are_friends(auth.uid(), c.id)) then c.photo else null end,
    'rating', c.rating,
    'peakRating', (select coalesce(max(r.peak), 0) from public.ratings r where r.coach_id = c.id),
    'ratings', (select jsonb_object_agg(r.mode, r.rating) from public.ratings r where r.coach_id = c.id),
    'xp', coalesce(p.data -> 'profile' -> 'xp', to_jsonb(0)),
    'totals', p.data -> 'profile' -> 'totals',
    'heroes', case
      when jsonb_typeof(p.data -> 'profile' -> 'heroes') = 'object' then p.data -> 'profile' -> 'heroes'
      else '{}'::jsonb
    end,
    'synergies', case
      when jsonb_typeof(p.data -> 'profile' -> 'synergies') = 'object' then p.data -> 'profile' -> 'synergies'
      else '{}'::jsonb
    end,
    'recent', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', m -> 'id',
            'playedAt', m -> 'playedAt',
            'mode', m -> 'mode',
            'duel', jsonb_typeof(m -> 'duel') = 'object',
            'difficulty', m -> 'difficulty',
            'xp', m -> 'xp',
            'verdict', m -> 'verdict',
            'reason', m -> 'reason',
            'rounds', m -> 'rounds',
            'roundsWon', m -> 'roundsWon',
            'roundsLost', m -> 'roundsLost',
            'lineup', m -> 'lineup',
            'synergies', m -> 'synergies',
            'mvp', m -> 'mvp',
            'heroKills', m -> 'heroKills',
            'towersDestroyed', m -> 'towersDestroyed',
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
  where c.id = coach
$$;

revoke execute on function public.coach_dossier(uuid) from public, anon, authenticated;

-- A ranked, registered coach who keeps the dossier open, and has not blocked the caller or been blocked by them.
create function public.is_public_coach(coach uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.coaches c
    join auth.users u on u.id = c.id and u.is_anonymous is false
    where c.id = coach
      and c.public_profile
      and exists (select 1 from public.ratings r where r.coach_id = c.id)
  )
  and not public.is_blocked(auth.uid(), coach)
$$;

revoke execute on function public.is_public_coach(uuid) from public, anon, authenticated;

-- Friends: the full dossier, whatever the coach chose for strangers.
create or replace function public.coach_profile(friend uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.coach_dossier(friend)
  where public.is_registered()
    and (friend = auth.uid() or public.are_friends(auth.uid(), friend))
$$;

-- Anyone who can see the leaderboard: the dossier of an open profile, or a friend's.
create function public.public_coach_profile(coach uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.coach_dossier(coach)
  where public.is_public_coach(coach)
    or (public.is_registered() and (coach = auth.uid() or public.are_friends(auth.uid(), coach)))
$$;

revoke execute on function public.public_coach_profile(uuid) from public;
grant execute on function public.public_coach_profile(uuid) to anon, authenticated;

-- One of the latest matches in full, for replays and round-by-round lineups. As for friends, a duel says only that it
-- was one, never against whom.
create function public.public_coach_match(coach uuid, match_id text)
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
  where c.id = coach
    and i <= 10
    and m ->> 'id' = match_id
    and (
      public.is_public_coach(coach)
      or (public.is_registered() and (coach = auth.uid() or public.are_friends(auth.uid(), coach)))
    )
  limit 1
$$;

revoke execute on function public.public_coach_match(uuid, text) from public;
grant execute on function public.public_coach_match(uuid, text) to anon, authenticated;

-- The coach's own choice.
create function public.my_public_profile()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.public_profile from public.coaches c where c.id = auth.uid()), true)
$$;

create function public.set_public_profile(visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_registered() then
    raise exception 'A profile needs an email or Google account' using errcode = '42501';
  end if;

  update public.coaches set public_profile = coalesce(visible, true) where id = auth.uid();
end;
$$;

revoke execute on function public.my_public_profile(), public.set_public_profile(boolean) from public, anon;
grant execute on function public.my_public_profile(), public.set_public_profile(boolean) to authenticated;
