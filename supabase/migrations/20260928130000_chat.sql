-- Chat between friends, and the tools to stay safe in it.
-- Messages are written only through send_message, which checks the friendship, cleans the text and limits
-- how fast a coach can write. Only the two coaches of a conversation can read it. Removing a friend or
-- blocking them deletes the conversation, and every conversation keeps its latest 200 messages.

create table public.messages (
  id bigint generated always as identity primary key,
  sender uuid not null references public.coaches (id) on delete cascade,
  recipient uuid not null references public.coaches (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender <> recipient)
);

comment on table public.messages is 'Chat messages between two friends.';

create index messages_by_conversation
on public.messages (least(sender, recipient), greatest(sender, recipient), id desc);

create index messages_unread on public.messages (recipient, sender) where read_at is null;
create index messages_by_sender on public.messages (sender, created_at desc);

-- A block stops friend requests and messages both ways. The blocked coach is not told.
create table public.blocks (
  blocker uuid not null references public.coaches (id) on delete cascade,
  blocked uuid not null references public.coaches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

-- A declined request cannot be sent again for a week.
create table public.friend_declines (
  requester uuid not null references public.coaches (id) on delete cascade,
  addressee uuid not null references public.coaches (id) on delete cascade,
  declined_at timestamptz not null default now(),
  primary key (requester, addressee)
);

alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.friend_declines enable row level security;

revoke all on table public.messages, public.blocks, public.friend_declines from anon, authenticated;

-- Reads go through the functions; this select only lets Realtime deliver a coach's own messages.
grant select on table public.messages to authenticated;

create policy "Coaches read their own conversations"
on public.messages for select to authenticated
using ((select auth.uid()) in (sender, recipient));

alter publication supabase_realtime add table public.messages;

-- Drops control characters and bidirectional overrides, which can hide or disguise text; line breaks stay.
create function public.clean_text(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(input, '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F\u200E\u200F\u202A-\u202E\u2066-\u2069]', '', 'g'),
        '\r\n?', E'\n', 'g'
      ),
      '\n{3,}', E'\n\n', 'g'
    ),
    E' \t\n'
  )
$$;

-- Names are shown to other players, so they get the same cleaning, on one line.
create function public.clean_name(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(regexp_replace(public.clean_text(input), '\s+', ' ', 'g'), 20)
$$;

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
  set name = shown, avatar = new.avatar, rating = new.rating, updated_at = now()
  where id = new.id
    and (name, avatar, rating) is distinct from (shown, new.avatar, new.rating);

  return new;
end;
$$;

update public.coaches set name = public.clean_name(name) where name <> public.clean_name(name);

-- A card made after the profile was saved gets the cleaned name too.
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
      select me, public.new_friend_code(), public.clean_name(coalesce(p.name, '')), p.avatar, coalesce(p.rating, 0)
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

create function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships f
    where f.accepted
      and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a))
  )
$$;

create function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks k
    where (k.blocker = a and k.blocked = b) or (k.blocker = b and k.blocked = a)
  )
$$;

-- Friend requests now respect blocks and the cooldown after a decline.
-- Adds 'cooldown' to the results; a block looks like an unknown code, so it is never revealed.
create or replace function public.request_friend(code text)
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

  if them is null or public.is_blocked(me, them) then
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

  if exists (
    select 1
    from public.friend_declines d
    where d.requester = me and d.addressee = them and d.declined_at > now() - interval '7 days'
  ) then
    return 'cooldown';
  end if;

  if (select count(*) from public.friendships where requester = me and not accepted) >= 50 then
    return 'limit';
  end if;

  insert into public.friendships (requester, addressee) values (me, them);

  return 'sent';
end;
$$;

create or replace function public.respond_friend(other uuid, accept boolean)
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

    return;
  end if;

  delete from public.friendships
  where requester = other and addressee = auth.uid() and not accepted;

  if found then
    insert into public.friend_declines (requester, addressee)
    values (other, auth.uid())
    on conflict (requester, addressee) do update set declined_at = now();
  end if;
end;
$$;

-- Ending a friendship ends the conversation too.
create function public.friendships_forget_chat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.messages m
  where (m.sender = old.requester and m.recipient = old.addressee)
     or (m.sender = old.addressee and m.recipient = old.requester);

  return old;
end;
$$;

create trigger friendships_forget_chat
after delete on public.friendships
for each row execute function public.friendships_forget_chat();

create function public.send_message(friend uuid, message text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := auth.uid();
  clean text;
  sent public.messages;
begin
  if not public.is_registered() then
    raise exception 'Chat needs an email or Google account' using errcode = '42501';
  end if;

  if not public.are_friends(me, friend) then
    raise exception 'Only friends can write to each other' using errcode = '42501';
  end if;

  clean := public.clean_text(message);

  if char_length(clean) not between 1 and 500 then
    raise exception 'A message is 1 to 500 characters' using errcode = '22023';
  end if;

  if (select count(*) from public.messages m where m.sender = me and m.created_at > now() - interval '10 seconds') >= 8
     or (select count(*) from public.messages m where m.sender = me and m.created_at > now() - interval '1 hour') >= 300
  then
    raise exception 'Too many messages; slow down' using errcode = 'P0429';
  end if;

  insert into public.messages (sender, recipient, body)
  values (me, friend, clean)
  returning * into sent;

  delete from public.messages m
  where m.id in (
    select k.id
    from public.messages k
    where least(k.sender, k.recipient) = least(me, friend)
      and greatest(k.sender, k.recipient) = greatest(me, friend)
    order by k.id desc
    offset 200
  );

  return sent;
end;
$$;

-- The latest 50 messages with a friend, or the 50 before `older_than`; oldest first.
create function public.conversation(friend uuid, older_than bigint default null)
returns setof public.messages
language sql
stable
security definer
set search_path = ''
as $$
  select *
  from (
    select m.*
    from public.messages m
    where ((m.sender = auth.uid() and m.recipient = friend) or (m.sender = friend and m.recipient = auth.uid()))
      and (older_than is null or m.id < older_than)
    order by m.id desc
    limit 50
  ) latest
  order by id
$$;

create function public.mark_read(friend uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages
  set read_at = now()
  where sender = friend and recipient = auth.uid() and read_at is null
$$;

create function public.unread_counts()
returns table (sender uuid, unread integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.sender, count(*)::integer
  from public.messages m
  where m.recipient = auth.uid() and m.read_at is null
  group by m.sender
$$;

-- Blocking ends the friendship (and so the conversation) and keeps them from coming back.
create function public.block_coach(other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me constant uuid := (public.ensure_coach()).id;
begin
  if other = me or not exists (select 1 from public.coaches where id = other) then
    return;
  end if;

  delete from public.friendships
  where (requester = me and addressee = other) or (requester = other and addressee = me);

  insert into public.blocks (blocker, blocked) values (me, other) on conflict do nothing;
end;
$$;

create function public.unblock_coach(other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.blocks where blocker = auth.uid() and blocked = other
$$;

create function public.list_blocked()
returns table (id uuid, name text, avatar text, rating integer, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.avatar, c.rating, k.created_at
  from public.blocks k
  join public.coaches c on c.id = k.blocked
  where k.blocker = auth.uid()
  order by c.name
$$;

revoke execute on function
  public.clean_text(text),
  public.clean_name(text),
  public.are_friends(uuid, uuid),
  public.is_blocked(uuid, uuid),
  public.request_friend(text),
  public.respond_friend(uuid, boolean),
  public.friendships_forget_chat(),
  public.send_message(uuid, text),
  public.conversation(uuid, bigint),
  public.mark_read(uuid),
  public.unread_counts(),
  public.block_coach(uuid),
  public.unblock_coach(uuid),
  public.list_blocked()
from public, anon;

grant execute on function
  public.request_friend(text),
  public.respond_friend(uuid, boolean),
  public.send_message(uuid, text),
  public.conversation(uuid, bigint),
  public.mark_read(uuid),
  public.unread_counts(),
  public.block_coach(uuid),
  public.unblock_coach(uuid),
  public.list_blocked()
to authenticated;
