-- Ranked fixes after 10.0: no recording twice, ten rated ghost duels a day, no instant ghost wins, results kept when
-- a replay cannot be run, and the daily limit between two coaches counting only duels that moved ratings.
-- Run after migrations in a disposable Supabase database. All writes roll back.
begin;

insert into auth.users(id, is_anonymous) values
  ('96000000-0000-4000-8000-000000000001', false),
  ('96000000-0000-4000-8000-000000000002', false);
insert into public.coaches(id, friend_code, name) values
  ('96000000-0000-4000-8000-000000000001', 'AAAA9696', 'Coach'),
  ('96000000-0000-4000-8000-000000000002', 'BBBB9696', 'Rival');

create temp table ids(name text primary key, id uuid);
grant all on ids to authenticated;

create function pg_temp.act_as(coach uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coach::text, true), set_config('request.jwt.claims', '{"is_anonymous":false}', true)
$$;

create function pg_temp.rating(coach uuid) returns integer language sql as $$
  select coalesce((select rating from public.ratings where coach_id = coach and mode = 'oneLane'), 0)
$$;

-- Two recordings in the pool.
select public.add_ghost_runs(
  jsonb_build_array(
    jsonb_build_object('mode', 'oneLane', 'balance', 'fix', 'rating', 0, 'boards', '[{"r":1},{"r":2},{"r":3}]'::jsonb),
    jsonb_build_object('mode', 'oneLane', 'balance', 'fix', 'rating', 0, 'boards', '[{"r":1},{"r":2},{"r":3}]'::jsonb)
  )
);

-- Joins the queue and waits long enough for a ghost, then asks for one.
create function pg_temp.ghost(name text) returns void language plpgsql as $$
begin
  perform pg_temp.act_as('96000000-0000-4000-8000-000000000001');
  set local role authenticated;
  perform public.find_match('oneLane', 'fix');
  reset role;

  update public.match_queue set joined_at = now() - interval '46 seconds'
  where coach_id = '96000000-0000-4000-8000-000000000001';

  set local role authenticated;
  insert into ids select name, (public.find_ghost('oneLane', 'fix') ->> 'id')::uuid;
  reset role;
end;
$$;

-- A win claimed before three rounds is refused; a loss can always be reported.
select pg_temp.ghost('first');
select pg_temp.act_as('96000000-0000-4000-8000-000000000001');
set local role authenticated;

do $$
declare
  ghost constant uuid := (select id from ids where name = 'first');
begin
  perform public.ghost_round(ghost, 1, '{"mine":1}');

  begin
    perform public.report_ghost(ghost, 0::smallint);
    raise exception 'A ghost win was accepted after one round';
  exception when sqlstate 'P0425' then
    null;
  end;

  perform public.ghost_round(ghost, 2, '{"mine":2}');
  perform public.ghost_round(ghost, 3, '{"mine":3}');

  if public.report_ghost(ghost, 0::smallint) <> 13 then
    raise exception 'A ghost win after three rounds did not count';
  end if;
end;
$$;

reset role;

-- A replay that cannot be run, such as under retired rules, keeps the result.
select public.verify_ghost((select id from ids where name = 'first'), null);

do $$
begin
  if pg_temp.rating('96000000-0000-4000-8000-000000000001') <> 13
    or (select verified_at from public.ghost_duels where id = (select id from ids where name = 'first')) is null
    or (select false_report from public.ghost_duels where id = (select id from ids where name = 'first'))
  then
    raise exception 'A ghost result the arbiter could not replay was taken away';
  end if;
end;
$$;

-- The second recording comes next, and then none: the first one was fought within 30 days.
select pg_temp.ghost('second');
select pg_temp.act_as('96000000-0000-4000-8000-000000000001');
set local role authenticated;
select public.forfeit_ghost((select id from ids where name = 'second'));
reset role;

do $$
begin
  if (select run_id from public.ghost_duels where id = (select id from ids where name = 'second'))
    = (select run_id from public.ghost_duels where id = (select id from ids where name = 'first'))
  then
    raise exception 'The same recording came twice';
  end if;
end;
$$;

select pg_temp.ghost('third');

do $$
begin
  if (select id from ids where name = 'third') is not null then
    raise exception 'A coach met a recording again within 30 days';
  end if;
end;
$$;

-- Past ten rated ghost duels in a day, a ghost duel moves no rating.
insert into public.ghost_duels (coach_id, mode, balance, seed, ghost_rating, ghost_boards, status, result, ended_by, rating_change, finished_at)
select '96000000-0000-4000-8000-000000000001', 'oneLane', 'fix', 'old' || n, 0, '[{},{},{}]', 'finished', 1, 'forfeit', -1, now()
from generate_series(1, 10) as n;

insert into public.ghost_duels (coach_id, mode, balance, seed, ghost_rating, ghost_boards, round, boards)
values ('96000000-0000-4000-8000-000000000001', 'oneLane', 'fix', 'capped', 0, '[{},{},{}]', 4, '[{},{},{}]');

insert into ids select 'capped', id from public.ghost_duels where seed = 'capped';

select pg_temp.act_as('96000000-0000-4000-8000-000000000001');
set local role authenticated;

do $$
begin
  if public.report_ghost((select id from ids where name = 'capped'), 0::smallint) <> 0 then
    raise exception 'An eleventh ghost duel in a day moved the rating';
  end if;
end;
$$;

reset role;

-- The daily limit between two coaches counts only duels that moved their ratings.
create function pg_temp.ranked(winner uuid, ended text, rounds integer) returns public.duels language plpgsql as $$
declare
  game public.duels;
begin
  insert into public.duels (host, guest, mode, ranked, status, winner, ended_by, round, finished_at)
  values (
    '96000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000002', 'oneLane', true,
    'finished', winner, ended, rounds, now()
  )
  returning * into game;

  perform public.settle_duel(game);

  return (select d from public.duels d where d.id = game.id);
end;
$$;

do $$
declare
  game public.duels;
begin
  for n in 1..3 loop
    game := pg_temp.ranked('96000000-0000-4000-8000-000000000001', 'result', 10);

    if not game.rated then
      raise exception 'Duel % of the day between the two coaches did not count', n;
    end if;
  end loop;

  game := pg_temp.ranked('96000000-0000-4000-8000-000000000001', 'result', 10);

  if game.rated then
    raise exception 'A fourth duel of the day between the same coaches moved their ratings';
  end if;

  -- A duel that moved nothing does not use up the allowance of the next day's count either.
  update public.duels set finished_at = now() - interval '2 days' where rated;
  game := pg_temp.ranked('96000000-0000-4000-8000-000000000002', 'result', 10);

  if not game.rated then
    raise exception 'An unrated duel used up the daily limit';
  end if;
end;
$$;

rollback;
