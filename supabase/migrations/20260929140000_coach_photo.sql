-- The Google account picture, when the coach shows it instead of a hero. Friends read it from the
-- public card; the address itself stays in the sign-in token and is copied here only while it is shown.

alter table public.coaches
add column photo text check (photo is null or (char_length(photo) <= 2048 and photo ~ '^https://[^[:space:]]+$'));

comment on column public.coaches.photo is
  'Google account picture while the coach shows it. Null when they picked a hero instead.';

-- Copies the picture from the sign-in token, or clears it. A passed address only asks for the picture to be shown:
-- friends' devices load whatever is stored here, so an address the client made up is never kept.
create function public.set_coach_photo(url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := (public.ensure_coach()).id;
  token constant text := nullif(
    coalesce(auth.jwt() -> 'user_metadata' ->> 'avatar_url', auth.jwt() -> 'user_metadata' ->> 'picture'),
    ''
  );
  chosen text := null;
begin
  if url is not null then
    chosen := token;

    if char_length(chosen) > 2048 or chosen !~ '^https://[^[:space:]]+$' then
      chosen := null;
    end if;
  end if;

  update public.coaches
  set photo = chosen, updated_at = now()
  where id = me and photo is distinct from chosen;
end;
$$;

drop function public.list_friends();

create function public.list_friends()
returns table (
  id uuid,
  name text,
  avatar text,
  photo text,
  rating integer,
  status text,
  since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.name,
    c.avatar,
    c.photo,
    c.rating,
    case when f.accepted then 'friend' when f.requester = auth.uid() then 'outgoing' else 'incoming' end,
    coalesce(f.accepted_at, f.created_at)
  from public.friendships f
  join public.coaches c on c.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by c.name
$$;

drop function public.list_blocked();

create function public.list_blocked()
returns table (id uuid, name text, avatar text, photo text, rating integer, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.avatar, c.photo, c.rating, k.created_at
  from public.blocks k
  join public.coaches c on c.id = k.blocked
  where k.blocker = auth.uid()
  order by c.name
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
  opponent_photo text,
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
    c.name, c.avatar, c.photo, c.rating
  from public.duels d
  join public.coaches c on c.id = case when d.host = auth.uid() then d.guest else d.host end
  where auth.uid() in (d.host, d.guest)
    and (d.status = 'active' or (d.status = 'invited' and d.created_at > now() - interval '60 seconds'))
  order by d.created_at desc
$$;

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
    'photo', c.photo,
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

revoke execute on function
  public.set_coach_photo(text),
  public.list_friends(),
  public.list_blocked(),
  public.my_duels()
from public, anon;

grant execute on function
  public.set_coach_photo(text),
  public.list_friends(),
  public.list_blocked(),
  public.my_duels()
to authenticated;
