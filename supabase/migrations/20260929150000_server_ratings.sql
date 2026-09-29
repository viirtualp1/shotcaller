-- Server ratings.
-- The rating is settled here, from duels the server saw end, and it is what friends see. The rating in a saved
-- profile is only the device's copy: the game takes these figures on every sync. Rules as in the game:
-- a win is worth 25 and 5 more when both devices saw the throne fall, a loss costs 20, nobody drops below zero.

alter table public.duels
  add column host_throne boolean,
  add column guest_throne boolean;

create table public.ratings (
  coach_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('threeLanes', 'twoLanes', 'oneLane')),
  rating integer not null default 0 check (rating >= 0),
  peak integer not null default 0 check (peak >= 0),
  primary key (coach_id, mode)
);

comment on table public.ratings is 'Duel rating per coach and mode. Only the duel functions change it.';

alter table public.ratings enable row level security;
revoke all on table public.ratings from anon, authenticated;

-- Everyone keeps the rating they have: read once from the saved profile, as the game computed it until now.
-- Profiles from before game modes had one rating, earned on three lanes.
with saved as (
  select
    p.id,
    m.mode,
    case
      when jsonb_typeof(p.data -> 'profile' -> 'ratings' -> m.mode) = 'number'
        then (p.data -> 'profile' -> 'ratings' ->> m.mode)::numeric
      when m.mode = 'threeLanes' then p.rating
      else 0
    end as rating,
    case
      when jsonb_typeof(p.data -> 'profile' -> 'peakRatings' -> m.mode) = 'number'
        then (p.data -> 'profile' -> 'peakRatings' ->> m.mode)::numeric
      else 0
    end as peak
  from public.profiles p
  cross join (values ('threeLanes'), ('twoLanes'), ('oneLane')) as m(mode)
)
insert into public.ratings (coach_id, mode, rating, peak)
select id, mode, greatest(0, least(rating, 100000))::integer, greatest(0, least(greatest(peak, rating), 100000))::integer
from saved;

update public.coaches c
set rating = coalesce((select max(r.rating) from public.ratings r where r.coach_id = c.id), 0)
where c.rating is distinct from coalesce((select max(r.rating) from public.ratings r where r.coach_id = c.id), 0);

-- Moves both coaches' ratings once a duel is finished with a winner; a draw or a disputed result moves nothing.
-- Runs with the rights of its caller: only the duel functions above, which own the tables, can use it.
create function public.apply_duel_rating(game public.duels)
returns void
language plpgsql
set search_path = ''
as $$
declare
  loser uuid;
  gain integer;
begin
  if game.status <> 'finished' or game.winner is null then
    return;
  end if;

  loser := case when game.winner = game.host then game.guest else game.host end;
  gain := 25 + case when game.ended_by = 'result' and game.host_throne and game.guest_throne then 5 else 0 end;

  insert into public.ratings as r (coach_id, mode, rating, peak)
  values (game.winner, game.mode, gain, gain)
  on conflict (coach_id, mode) do update
  set rating = r.rating + gain, peak = greatest(r.peak, r.rating + gain);

  insert into public.ratings as r (coach_id, mode)
  values (loser, game.mode)
  on conflict (coach_id, mode) do update
  set rating = greatest(0, r.rating - 20);

  update public.coaches c
  set rating = (select coalesce(max(r.rating), 0) from public.ratings r where r.coach_id = c.id), updated_at = now()
  where c.id in (game.winner, loser);
end;
$$;

drop function public.report_duel(uuid, smallint);

-- Both devices report the result they replayed; the duel is settled when both reports are in.
create function public.report_duel(duel uuid, winning_side smallint, by_throne boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
  my_side smallint;
  reported constant smallint := coalesce(winning_side, -1);
begin
  if reported not in (-1, 0, 1) then
    raise exception 'Unknown result' using errcode = '22023';
  end if;

  select * into game from public.duels where id = duel for update;
  my_side := case when game.host = auth.uid() then 0 when game.guest = auth.uid() then 1 end;

  if my_side is null then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status <> 'active' then
    return;
  end if;

  if my_side = 0 then
    game.host_result := reported;
    game.host_throne := coalesce(by_throne, false);
  else
    game.guest_result := reported;
    game.guest_throne := coalesce(by_throne, false);
  end if;

  update public.duels
  set host_result = game.host_result, guest_result = game.guest_result,
    host_throne = game.host_throne, guest_throne = game.guest_throne
  where id = duel;

  if game.host_result is null or game.guest_result is null then
    return;
  end if;

  update public.duels
  set
    status = case when game.host_result = game.guest_result then 'finished' else 'disputed' end,
    winner = case game.host_result when 0 then game.host when 1 then game.guest end,
    ended_by = 'result',
    finished_at = now()
  where id = duel
  returning * into game;

  perform public.apply_duel_rating(game);
end;
$$;

create or replace function public.forfeit_duel(duel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
begin
  update public.duels
  set
    status = 'finished',
    winner = case when host = auth.uid() then guest else host end,
    ended_by = 'forfeit',
    finished_at = now()
  where id = duel and status = 'active' and auth.uid() in (host, guest)
  returning * into game;

  if found then
    perform public.apply_duel_rating(game);
  end if;
end;
$$;

-- A coach whose opponent stopped sending boards takes the win once the round has run out of time.
create or replace function public.claim_duel(duel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
  my_side smallint;
begin
  select * into game from public.duels where id = duel for update;
  my_side := case when game.host = auth.uid() then 0 when game.guest = auth.uid() then 1 end;

  if my_side is null then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status <> 'active' then
    return;
  end if;

  if public.duel_board_sent(duel, game.round, (1 - my_side)::smallint)
     or game.round_opened_at > now() - public.duel_round_timeout()
  then
    raise exception 'The opponent still has time' using errcode = 'P0425';
  end if;

  update public.duels
  set status = 'finished', winner = auth.uid(), ended_by = 'timeout', finished_at = now()
  where id = duel
  returning * into game;

  perform public.apply_duel_rating(game);
end;
$$;

-- The caller's ratings and peaks by mode; null for a coach who has never had any.
create function public.my_ratings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(*) = 0 then null else jsonb_build_object(
    'ratings', jsonb_object_agg(mode, rating),
    'peaks', jsonb_object_agg(mode, peak)
  ) end
  from public.ratings
  where coach_id = auth.uid()
$$;

-- The public card keeps the name and avatar of the saved profile; the rating comes from the ratings above.
create or replace function public.profiles_sync_coach()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shown constant text := public.clean_name(new.name);
begin
  update public.coaches
  set name = shown, avatar = new.avatar, updated_at = now()
  where id = new.id
    and (name, avatar) is distinct from (shown, new.avatar);

  return new;
end;
$$;

create or replace function public.ensure_coach()
returns public.coaches
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := auth.uid();
  card public.coaches;
begin
  if not public.is_registered() then
    raise exception 'Friends need an email or Google account' using errcode = '42501';
  end if;

  loop
    select * into card from public.coaches where id = me;

    if found then
      return card;
    end if;

    begin
      insert into public.coaches (id, friend_code, name, avatar, rating)
      select
        me,
        public.new_friend_code(),
        public.clean_name(coalesce(p.name, '')),
        p.avatar,
        (select coalesce(max(r.rating), 0) from public.ratings r where r.coach_id = me)
      from (select 1) as one
      left join public.profiles p on p.id = me
      returning * into card;

      return card;
    exception when unique_violation then
      -- The code was taken, or a parallel call made the card: look again and retry if needed.
      null;
    end;
  end loop;
end;
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
    'peakRating', (select coalesce(max(r.peak), 0) from public.ratings r where r.coach_id = c.id),
    'ratings', (select jsonb_object_agg(r.mode, r.rating) from public.ratings r where r.coach_id = c.id),
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

revoke execute on function public.apply_duel_rating(public.duels) from public, anon, authenticated;

revoke execute on function
  public.report_duel(uuid, smallint, boolean),
  public.my_ratings()
from public, anon;

grant execute on function
  public.report_duel(uuid, smallint, boolean),
  public.my_ratings()
to authenticated;
