-- Only a current snapshot is kept. Friends can read through the RPC while the owner is active.
create table public.live_matches (
  user_id uuid primary key references public.coaches(id) on delete cascade,
  data jsonb not null check (octet_length(data::text) <= 131072),
  updated_at timestamptz not null default now()
);

alter table public.live_matches enable row level security;
revoke all on public.live_matches from anon, authenticated;

create function public.publish_live_match(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_registered() then
    raise exception 'Registered account required' using errcode = '42501';
  end if;

  if payload is null then
    delete from public.live_matches where user_id = auth.uid();
    return;
  end if;

  if jsonb_typeof(payload) <> 'object'
    or jsonb_typeof(payload -> 'record') is distinct from 'object'
    or coalesce(payload ->> 'phase', '') not in ('planning', 'battle', 'summary', 'finished')
  then
    raise exception 'Invalid live match';
  end if;

  -- Never expose the duel opponent's identity through this viewing snapshot.
  payload := jsonb_set(payload, '{record,duel}', 'null'::jsonb);

  insert into public.live_matches(user_id, data) values (auth.uid(), payload)
  on conflict (user_id) do update set data = excluded.data, updated_at = now();
end;
$$;

create function public.coach_live_match(friend uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select data from public.live_matches
  where user_id = friend
    and updated_at > now() - interval '30 seconds'
    and public.is_registered()
    and public.are_friends(auth.uid(), friend)
    and not public.is_blocked(auth.uid(), friend)
$$;

revoke all on function public.publish_live_match(jsonb), public.coach_live_match(uuid) from public, anon;
grant execute on function public.publish_live_match(jsonb), public.coach_live_match(uuid) to authenticated;
