-- Keeping the database small and the traffic low.
-- Old rows nobody reads are deleted on a schedule, stale duels settle on their own, the match archive keeps
-- summaries instead of replays, a live match is streamed only while a friend watches it, and who is online is
-- polled by friends instead of broadcast to every signed-in player.

-- The archive is for history and leaderboards; replays live in the profile, which keeps the latest few.
create index matches_expiry on public.matches using brin (played_at);
create index telemetry_receipts_expiry on public.telemetry_receipts using brin (created_at);

create function public.matches_trim()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.data := new.data - 'roundLineups' - 'replays';

  return new;
end;
$$;

create trigger matches_trim
before insert on public.matches
for each row execute function public.matches_trim();

update public.matches
set data = data - 'roundLineups' - 'replays'
where data ? 'roundLineups' or data ? 'replays';

-- Boards reach the other device through the function calls; the duels row says when one is in.
alter publication supabase_realtime drop table public.duel_boards;

delete from public.duel_boards b
using public.duels d
where d.id = b.duel_id and d.status <> 'active';

-- Live matches: friends' devices ask every few seconds while they watch; the player's device then streams.
alter table public.live_matches add column watched_at timestamptz;

drop function public.publish_live_match(jsonb);

-- Stores the snapshot and says whether a friend watched in the last few seconds.
create function public.publish_live_match(payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  watched boolean;
begin
  if not public.is_registered() then
    raise exception 'Registered account required' using errcode = '42501';
  end if;

  if payload is null then
    delete from public.live_matches where user_id = auth.uid();
    return false;
  end if;

  if jsonb_typeof(payload) <> 'object'
    or jsonb_typeof(payload -> 'record') is distinct from 'object'
    or coalesce(payload ->> 'phase', '') not in ('planning', 'battle', 'summary', 'finished')
  then
    raise exception 'Invalid live match';
  end if;

  -- Never expose the duel opponent's identity through this viewing snapshot.
  payload := jsonb_set(payload, '{record,duel}', 'null'::jsonb);

  insert into public.live_matches as l (user_id, data) values (auth.uid(), payload)
  on conflict (user_id) do update set data = excluded.data, updated_at = now()
  returning l.watched_at > now() - interval '10 seconds' into watched;

  return coalesce(watched, false);
end;
$$;

-- Keeps the stored snapshot current without sending it again; says whether a friend is watching.
create function public.keep_live_match()
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.live_matches
  set updated_at = now()
  where user_id = auth.uid() and public.is_registered()
  returning coalesce(watched_at > now() - interval '10 seconds', false)
$$;

create or replace function public.coach_live_match(friend uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if not public.is_registered()
    or not public.are_friends(auth.uid(), friend)
    or public.is_blocked(auth.uid(), friend)
  then
    return null;
  end if;

  update public.live_matches
  set watched_at = now()
  where user_id = friend and updated_at > now() - interval '30 seconds'
  returning data into snapshot;

  return snapshot;
end;
$$;

-- Who is online. Each device says what its coach is doing every half minute; friends read it on the same call.
alter table public.coaches
  add column seen_at timestamptz,
  add column activity text check (activity in ('menu', 'match', 'duel')),
  add column activity_round integer check (activity_round between 1 and 40);

-- Records the caller's activity (null when leaving) and returns the friends seen in the last 75 seconds.
create function public.friends_online(doing text, doing_round integer)
returns table (id uuid, activity text, round integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := auth.uid();
begin
  if not public.is_registered() then
    return;
  end if;

  if doing is not null and doing not in ('menu', 'match', 'duel') then
    raise exception 'Unknown activity' using errcode = '22023';
  end if;

  -- Rewritten only when something changed or the last sign of life is getting old.
  update public.coaches c
  set
    seen_at = case when doing is null then null else now() end,
    activity = doing,
    activity_round = case when doing_round between 1 and 40 then doing_round end
  where c.id = me
    and (
      c.activity is distinct from doing
      or c.activity_round is distinct from (case when doing_round between 1 and 40 then doing_round end)
      or c.seen_at is null
      or c.seen_at < now() - interval '20 seconds'
    );

  if doing is null then
    return;
  end if;

  return query
  select c.id, c.activity, c.activity_round
  from public.friendships f
  join public.coaches c on c.id = case when f.requester = me then f.addressee else f.requester end
  where f.accepted
    and me in (f.requester, f.addressee)
    and c.seen_at > now() - interval '75 seconds'
    and not public.is_blocked(me, c.id);
end;
$$;

-- Settles duels nobody settled: rounds that ran out of time a while ago, and invites past their minute.
-- A duel where nobody can be blamed is abandoned after half an hour.
create function public.settle_stale_duels()
returns void
language plpgsql
set search_path = ''
as $$
declare
  game public.duels;
begin
  for game in
    select *
    from public.duels
    where status = 'active' and round_opened_at < now() - public.duel_round_timeout() - interval '2 minutes'
    for update skip locked
  loop
    perform public.lock_coaches(game.host, game.guest);
    perform public.resolve_stale_duel(game, game.round_opened_at < now() - interval '30 minutes');
  end loop;

  update public.duels
  set status = 'expired'
  where status = 'invited' and created_at < now() - interval '60 seconds';
end;
$$;

-- Deletes what nothing reads any more. Ratings are kept in their own table, so finished duels can go.
create function public.cleanup_old_data()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.duel_boards b
  using public.duels d
  where d.id = b.duel_id and d.status <> 'active';

  delete from public.duels
  where (status in ('declined', 'cancelled', 'expired') and created_at < now() - interval '1 day')
    or (status in ('finished', 'disputed', 'abandoned') and finished_at < now() - interval '30 days');

  delete from public.match_queue where seen_at < now() - interval '1 minute';
  delete from public.live_matches where updated_at < now() - interval '10 minutes';
  delete from public.friend_declines where declined_at < now() - interval '7 days';

  -- Receipts only stop a match from being counted twice, and a match is accepted for five minutes after it ends.
  delete from public.telemetry_receipts where created_at < now() - interval '2 days';

  delete from public.matches where played_at < now() - interval '90 days';

  -- Account profiles are durable progress, including guests. Account deletion needs a separate policy.
  if to_regclass('cron.job_run_details') is not null then
    execute 'delete from cron.job_run_details where end_time < now() - interval ''7 days''';
  end if;
end;
$$;

revoke execute on function
  public.matches_trim(),
  public.settle_stale_duels(),
  public.cleanup_old_data()
from public, anon, authenticated;

revoke execute on function
  public.publish_live_match(jsonb),
  public.keep_live_match(),
  public.friends_online(text, integer)
from public, anon;

grant execute on function
  public.publish_live_match(jsonb),
  public.keep_live_match(),
  public.friends_online(text, integer)
to authenticated;

-- Both jobs need pg_cron, which every Supabase project can turn on. Without it, run them from elsewhere.
do $$
begin
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('settle-stale-duels', '*/5 * * * *', 'select public.settle_stale_duels()');
    perform cron.schedule('cleanup-old-data', '17 3 * * *', 'select public.cleanup_old_data()');
  else
    raise notice 'pg_cron is not available: schedule public.settle_stale_duels() and public.cleanup_old_data()';
  end if;
end;
$$;
