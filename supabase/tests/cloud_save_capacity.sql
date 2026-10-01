-- Run after migrations in a disposable Supabase database. All writes roll back.
-- Representative history: twenty matches, twenty rounds, six heroes per side,
-- two items per hero. Only the five newest matches retain round details.
begin;

insert into auth.users (id) values
  ('30000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"is_anonymous":false}', true);
set local role authenticated;

do $$
declare
  picks jsonb;
  lineup jsonb;
  heroes jsonb;
  rounds jsonb;
  replays jsonb;
  history jsonb;
  game jsonb;
  recent jsonb;
  snapshot jsonb;
  constraint_name text;
begin
  select
    jsonb_agg(jsonb_build_array(hero, 3, lane, jsonb_build_array('broadsword', 'manaStone'))),
    jsonb_agg(jsonb_build_object(
      'heroId', hero, 'stars', 3, 'lane', lane, 'items', jsonb_build_array('broadsword', 'manaStone')
    )),
    jsonb_agg(jsonb_build_object(
      'heroId', hero, 'stars', 3, 'kills', 8, 'deaths', 5, 'damage', 12543.125,
      'healing', 1356.375, 'structureDamage', 2843.625, 'damageReceived', 4856.875,
      'rounds', 20, 'lastHits', 45
    ))
  into picks, lineup, heroes
  from (values
    ('blademaster', 'top'), ('packLeader', 'top'), ('pyromancer', 'mid'),
    ('frostWitch', 'mid'), ('necromancer', 'bot'), ('spearman', 'bot')
  ) as roster(hero, lane);

  select
    jsonb_agg(jsonb_build_array(picks, picks)),
    jsonb_agg(jsonb_build_object(
      'seed', 'match-capacity-round-' || n,
      'structures', jsonb_build_array(
        jsonb_build_object('top', 243.75, 'mid', 345.5, 'bot', 485.25, 'inner', 0, 'throne', 850.125),
        jsonb_build_object('top', 230.5, 'mid', 358.75, 'bot', 380.25, 'inner', 0, 'throne', 625.875)
      ),
      'stances', jsonb_build_array(
        jsonb_build_object('top', 'hold', 'mid', 'push', 'bot', 'group'),
        jsonb_build_object('top', 'group', 'mid', 'hold', 'bot', 'push')
      )
    )),
    jsonb_agg(to_jsonb(case when n % 2 = 0 then 'win' else 'loss' end))
  into rounds, replays, history
  from generate_series(1, 20) as n;

  game := jsonb_build_object(
    'id', 'capacity-match-1', 'playedAt', '2026-10-01T12:00:00.000Z',
    'mode', 'threeLanes', 'difficulty', 'standard', 'verdict', 'draw', 'reason', 'roundLimit',
    'rounds', 20, 'roundsWon', 10, 'roundsLost', 10,
    'lineup', lineup, 'opponentLineup', lineup,
    'heroes', heroes, 'opponentHeroes', heroes,
    'synergies', jsonb_build_array('arcane'), 'opponentSynergies', jsonb_build_array('arcane'),
    'roundLineups', rounds, 'replays', replays, 'history', history,
    'side', 0, 'balance', 'capacity-regression', 'mvp', 'blademaster', 'duel', null,
    'heroKills', 48, 'towersDestroyed', 0, 'goldEarned', 260,
    'ratingBefore', 400, 'ratingAfter', 400, 'xp', 180, 'rewards', '[]'::jsonb, 'trialId', null
  );

  select jsonb_agg(
    (case when n <= 5 then game else game || '{"roundLineups":[],"replays":[]}'::jsonb end)
      || jsonb_build_object('id', 'capacity-match-' || n)
    order by n
  ) into recent from generate_series(1, 20) as n;

  snapshot := jsonb_build_object('version', 2, 'profile', jsonb_build_object(
    'name', 'Capacity test', 'avatar', null, 'createdAt', '2026-09-01T12:00:00.000Z',
    'rating', 400, 'peakRating', 400, 'xp', 3600,
    'ratings', jsonb_build_object('threeLanes', 400, 'twoLanes', 0, 'oneLane', 0),
    'peakRatings', jsonb_build_object('threeLanes', 400, 'twoLanes', 0, 'oneLane', 0),
    'career', jsonb_build_object('achievements', '{}'::jsonb, 'weeks', '{}'::jsonb, 'trials', '{}'::jsonb),
    'totals', jsonb_build_object(
      'matches', 20, 'wins', 0, 'losses', 0, 'draws', 20, 'throneWins', 0,
      'roundsPlayed', 400, 'heroKills', 960, 'streak', 0, 'bestWinStreak', 0, 'fastestWin', null
    ),
    'heroes', '{}'::jsonb, 'synergies', '{}'::jsonb, 'recent', recent
  ));

  if pg_column_size(snapshot) <= 65536 or pg_column_size(game) <= 16384 then
    raise exception 'Fixture must reproduce both original size limits';
  end if;

  raise notice 'Profile bytes: %, match bytes: %', pg_column_size(snapshot), pg_column_size(game);

  insert into public.profiles (id, name, data) values (auth.uid(), 'Capacity test', snapshot);
  insert into public.matches (id, played_at, verdict, data)
    values ('capacity-match-1', now(), 'draw', game);

  update public.profiles set data = snapshot, revision = revision + 1 where id = auth.uid();

  if not exists (select 1 from public.profiles where id = auth.uid() and revision = 2 and data = snapshot)
    or not exists (select 1 from public.matches where id = 'capacity-match-1' and data = game)
  then
    raise exception 'Cloud round trip lost history or replay data';
  end if;

  begin
    update public.profiles set data = jsonb_build_array(repeat('x', 1048576)), revision = revision + 1
      where id = auth.uid();
    raise exception 'Oversized profile accepted';
  exception when check_violation then
    get stacked diagnostics constraint_name = constraint_name;
    if constraint_name <> 'profiles_data_check' then
      raise exception 'Unexpected profile check: %', constraint_name;
    end if;
  end;

  begin
    insert into public.matches (id, played_at, verdict, data)
      values ('oversized', now(), 'draw', jsonb_build_array(repeat('x', 262144)));
    raise exception 'Oversized match accepted';
  exception when check_violation then
    get stacked diagnostics constraint_name = constraint_name;
    if constraint_name <> 'matches_data_check' then
      raise exception 'Unexpected match check: %', constraint_name;
    end if;
  end;

  begin
    update public.profiles set revision = revision + 2 where id = auth.uid();
    raise exception 'Skipped revision accepted';
  exception when raise_exception then
    if sqlerrm not like 'profile revision must go from %' then
      raise;
    end if;
  end;

  begin
    insert into public.profiles (id, name, data)
      values ('30000000-0000-4000-8000-000000000002', 'Other player', snapshot);
    raise exception 'Another account profile accepted';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

rollback;
