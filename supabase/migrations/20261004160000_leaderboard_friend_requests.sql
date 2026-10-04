-- Registered coaches can send requests from the leaderboard. Keep friend codes private
-- and reuse request_friend for blocks, limits, declined-request cooldowns and reciprocal requests.
create or replace function public.request_leaderboard_friend(other uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text;
begin
  if not public.is_registered() then
    raise exception 'Friends need an email or Google account' using errcode = '42501';
  end if;

  select c.friend_code into code
  from public.coaches c
  join auth.users u on u.id = c.id and u.is_anonymous is false
  where c.id = other and exists (select 1 from public.ratings r where r.coach_id = c.id);

  if code is null then
    return 'notFound';
  end if;

  return public.request_friend(code);
end;
$$;

revoke execute on function public.request_leaderboard_friend(uuid) from public, anon;
grant execute on function public.request_leaderboard_friend(uuid) to authenticated;
