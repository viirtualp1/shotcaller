-- Only ranked duels move MMR. A duel between friends is picked by both players, so two friends, or one player
-- with two accounts, could trade wins and climb the leaderboard. Friendly duels still record disputes,
-- so a coach who misreports results is remembered either way.
create or replace function public.settle_duel(game public.duels)
returns void
language plpgsql
set search_path = ''
as $$
declare
  loser uuid;
  winner_rating integer;
  loser_rating integer;
  gain integer;
  loss integer;
begin
  delete from public.duel_boards where duel_id = game.id;

  if game.status = 'disputed' then
    update public.coaches set dispute_score = dispute_score + 1 where id in (game.host, game.guest);

    return;
  end if;

  if game.status <> 'finished' then
    return;
  end if;

  update public.coaches set dispute_score = dispute_score * 0.8 where id in (game.host, game.guest);

  if game.winner is null or not game.ranked then
    return;
  end if;

  loser := case when game.winner = game.host then game.guest else game.host end;

  insert into public.ratings (coach_id, mode)
  values (game.winner, game.mode), (loser, game.mode)
  on conflict (coach_id, mode) do nothing;

  perform 1
  from public.ratings
  where mode = game.mode and coach_id in (game.winner, loser)
  order by coach_id
  for update;

  select rating into winner_rating from public.ratings where coach_id = game.winner and mode = game.mode;
  select rating into loser_rating from public.ratings where coach_id = loser and mode = game.mode;

  gain := public.elo_change(winner_rating, loser_rating, true);
  loss := -public.elo_change(loser_rating, winner_rating, false);

  update public.ratings
  set rating = rating + gain, peak = greatest(peak, rating + gain)
  where coach_id = game.winner and mode = game.mode;

  update public.ratings
  set rating = greatest(0, rating - loss)
  where coach_id = loser and mode = game.mode;

  update public.coaches c
  set rating = (select coalesce(max(r.rating), 0) from public.ratings r where r.coach_id = c.id), updated_at = now()
  where c.id in (game.winner, loser);
end;
$$;

revoke execute on function public.settle_duel(public.duels) from public, anon, authenticated;
