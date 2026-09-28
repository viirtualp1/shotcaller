-- Game modes.
-- A duel is played in the mode the inviting coach picks. Friends see the rating of every mode and the mode
-- of each recent match; whether a match was a duel is shown, but not who it was against.

alter table public.duels
  add column mode text not null default 'threeLanes'
    check (mode in ('threeLanes', 'twoLanes', 'oneLane'));

drop function public.invite_duel(uuid);

create function public.invite_duel(friend uuid, game_mode text default 'threeLanes')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := (public.ensure_coach()).id;
  existing uuid;
  invited uuid;
begin
  if game_mode is null or game_mode not in ('threeLanes', 'twoLanes', 'oneLane') then
    raise exception 'Unknown game mode' using errcode = '22023';
  end if;

  if not public.are_friends(me, friend) then
    raise exception 'Only friends can duel' using errcode = '42501';
  end if;

  update public.duels
  set status = 'expired'
  where status = 'invited' and created_at < now() - interval '60 seconds' and (host in (me, friend) or guest in (me, friend));

  if public.in_active_duel(me) or public.in_active_duel(friend) then
    raise exception 'A duel is already on' using errcode = 'P0409';
  end if;

  select id into existing
  from public.duels
  where status = 'invited' and host = me and guest = friend;

  -- Asking again, perhaps for another mode, updates the open invite instead of adding one.
  if found then
    update public.duels set mode = game_mode where id = existing;
    return existing;
  end if;

  if (select count(*) from public.duels where host = me and created_at > now() - interval '5 minutes') >= 10 then
    raise exception 'Too many invites; slow down' using errcode = 'P0429';
  end if;

  insert into public.duels (host, guest, mode) values (me, friend, game_mode) returning id into invited;

  return invited;
end;
$$;

drop function public.my_duels();

create function public.my_duels()
returns table (
  id uuid,
  host uuid,
  guest uuid,
  status text,
  mode text,
  seed text,
  round integer,
  round_opened_at timestamptz,
  host_board_round integer,
  guest_board_round integer,
  created_at timestamptz,
  opponent_name text,
  opponent_avatar text,
  opponent_rating integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id, d.host, d.guest, d.status, d.mode, d.seed, d.round, d.round_opened_at,
    d.host_board_round, d.guest_board_round, d.created_at,
    c.name, c.avatar, c.rating
  from public.duels d
  join public.coaches c on c.id = case when d.host = auth.uid() then d.guest else d.host end
  where auth.uid() in (d.host, d.guest)
    and (d.status = 'active' or (d.status = 'invited' and d.created_at > now() - interval '60 seconds'))
  order by d.created_at desc
$$;

revoke execute on function
  public.invite_duel(uuid, text),
  public.my_duels()
from public, anon;

grant execute on function
  public.invite_duel(uuid, text),
  public.my_duels()
to authenticated;

create or replace function public.coach_profile(friend uuid)
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
    'ratings', p.data -> 'profile' -> 'ratings',
    'xp', coalesce(p.data -> 'profile' -> 'xp', to_jsonb(0)),
    'totals', p.data -> 'profile' -> 'totals',
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
