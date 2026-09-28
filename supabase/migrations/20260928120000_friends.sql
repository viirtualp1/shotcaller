-- Friends.
-- Every coach with an email or Google account gets a public card with a friend code. A card is readable
-- only through the functions below: by its owner, by people they share a friendship row with, and by exact
-- friend code, so the list of players cannot be crawled. Guest (anonymous) accounts have no friends.

create table public.coaches (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Eight characters without look-alikes (no I, O, 0, 1); shown as XXXX-XXXX.
  friend_code text not null unique check (friend_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  name text not null default '' check (char_length(name) <= 20),
  avatar text check (char_length(avatar) <= 32),
  rating integer not null default 0 check (rating >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.coaches is 'Public coach card: what friends and opponents see.';

create table public.friendships (
  requester uuid not null references public.coaches (id) on delete cascade,
  addressee uuid not null references public.coaches (id) on delete cascade,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester, addressee),
  check (requester <> addressee)
);

comment on table public.friendships is 'A friend request, and once accepted a friendship. One row per pair of coaches.';

create unique index friendships_one_per_pair
on public.friendships (least(requester, addressee), greatest(requester, addressee));

create index friendships_by_addressee on public.friendships (addressee);

alter table public.coaches enable row level security;
alter table public.friendships enable row level security;

revoke all on table public.coaches, public.friendships from anon, authenticated;

-- Reads go through the functions; this select only lets Realtime tell a coach about their own requests.
grant select on table public.friendships to authenticated;

create policy "Coaches see friendships they are part of"
on public.friendships for select to authenticated
using ((select auth.uid()) in (requester, addressee));

alter publication supabase_realtime add table public.friendships;

-- A signed-in coach with an email or Google account, not a guest.
create function public.is_registered()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

create function public.new_friend_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
begin
  for i in 1..8 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;

  return code;
end;
$$;

-- The caller's card, created on first use from their saved profile.
create function public.ensure_coach()
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
      select me, public.new_friend_code(), coalesce(p.name, ''), p.avatar, coalesce(p.rating, 0)
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

-- Keeps the public card in step with the saved profile.
create function public.profiles_sync_coach()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.coaches
  set name = new.name, avatar = new.avatar, rating = new.rating, updated_at = now()
  where id = new.id
    and (name, avatar, rating) is distinct from (new.name, new.avatar, new.rating);

  return new;
end;
$$;

create trigger profiles_sync_coach
after insert or update of name, avatar, rating on public.profiles
for each row execute function public.profiles_sync_coach();

-- 'sent', 'accepted' (they had already asked us), 'friends', 'notFound', 'self' or 'limit'.
create function public.request_friend(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := (public.ensure_coach()).id;
  them uuid;
  existing public.friendships;
begin
  select id into them
  from public.coaches
  where friend_code = upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'));

  if them is null then
    return 'notFound';
  end if;

  if them = me then
    return 'self';
  end if;

  select * into existing
  from public.friendships
  where (requester = me and addressee = them) or (requester = them and addressee = me);

  if found then
    if existing.accepted then
      return 'friends';
    end if;

    if existing.requester = them then
      update public.friendships
      set accepted = true, accepted_at = now()
      where requester = them and addressee = me;

      return 'accepted';
    end if;

    return 'sent';
  end if;

  if (select count(*) from public.friendships where requester = me and not accepted) >= 50 then
    return 'limit';
  end if;

  insert into public.friendships (requester, addressee) values (me, them);

  return 'sent';
end;
$$;

create function public.respond_friend(other uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if accept then
    update public.friendships
    set accepted = true, accepted_at = now()
    where requester = other and addressee = auth.uid() and not accepted;
  else
    delete from public.friendships
    where requester = other and addressee = auth.uid() and not accepted;
  end if;
end;
$$;

-- Unfriends, or takes back a request not answered yet.
create function public.remove_friend(other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.friendships
  where (requester = auth.uid() and addressee = other) or (requester = other and addressee = auth.uid());
$$;

-- Friends and open requests both ways, with the other coach's card.
create function public.list_friends()
returns table (id uuid, name text, avatar text, rating integer, status text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.name,
    c.avatar,
    c.rating,
    case when f.accepted then 'friend' when f.requester = auth.uid() then 'outgoing' else 'incoming' end,
    coalesce(f.accepted_at, f.created_at)
  from public.friendships f
  join public.coaches c on c.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by c.name
$$;

revoke execute on function
  public.is_registered(),
  public.new_friend_code(),
  public.ensure_coach(),
  public.profiles_sync_coach(),
  public.request_friend(text),
  public.respond_friend(uuid, boolean),
  public.remove_friend(uuid),
  public.list_friends()
from public, anon;

grant execute on function
  public.ensure_coach(),
  public.request_friend(text),
  public.respond_friend(uuid, boolean),
  public.remove_friend(uuid),
  public.list_friends()
to authenticated;
