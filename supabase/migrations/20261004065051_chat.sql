-- Phase 4 / M013 chat: conversations, participants, messages (PRODUCT_SPEC §7.5).
-- Built before the Settle In modules so their accept-RPCs can open conversations.
-- No cold messaging: conversations and participants are created only by private.open_conversation(),
-- which the accept RPCs call. API roles cannot insert either table.

create type public.conversation_context as enum ('relocation_offer', 'flat_contact', 'flatmate_connection');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  context_type public.conversation_context not null,
  -- Id of the accepted offer / contact request / connection that opened the conversation.
  context_id uuid not null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (context_type, context_id)
);

create index conversations_last_message_idx on public.conversations (last_message_at desc nulls last);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index conversation_participants_user_id_idx on public.conversation_participants (user_id);

create trigger conversation_participants_set_updated_at
  before update on public.conversation_participants
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  -- Plain text only.
  body text check (char_length(body) between 1 and 2000),
  -- Path in the private chat-attachments bucket: '{conversation_id}/{uuid}.{ext}'.
  attachment_path text check (char_length(attachment_path) <= 300),
  deleted_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body is not null or attachment_path is not null)
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_id_idx on public.messages (sender_id);

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

-- Helpers ------------------------------------------------------------------------

create or replace function private.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = (select auth.uid())
  );
$$;

-- Storage folder name -> participant check, tolerant of malformed paths.
create or replace function private.is_conversation_participant_path(p_folder text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.is_conversation_participant(p_folder::uuid)
    else false
  end;
$$;

-- Opens (or returns) the conversation for an accepted offer/request/connection. Internal only.
create or replace function private.open_conversation(
  p_context public.conversation_context,
  p_context_id uuid,
  p_user_a uuid,
  p_user_b uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.conversations (context_type, context_id)
  values (p_context, p_context_id)
  on conflict (context_type, context_id) do update set updated_at = now()
  returning id into v_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_id, p_user_a), (v_id, p_user_b)
  on conflict (conversation_id, user_id) do nothing;

  return v_id;
end;
$$;

-- Message rules: the sender is a participant, is not suspended, has no block with the other participant,
-- and stays under 30 messages a minute. Attachments must live in the conversation's folder.
create or replace function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return new;
  end if;
  if new.sender_id is distinct from v_uid then
    raise exception 'not_sender' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id and cp.user_id = v_uid
  ) then
    raise exception 'not_participant' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_uid and p.suspended_at is not null) then
    raise exception 'account_suspended' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.conversation_participants cp
    join public.blocks b
      on (b.blocker_id = cp.user_id and b.blocked_id = v_uid)
      or (b.blocker_id = v_uid and b.blocked_id = cp.user_id)
    where cp.conversation_id = new.conversation_id and cp.user_id <> v_uid
  ) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  if new.attachment_path is not null
     and new.attachment_path !~ ('^' || new.conversation_id::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'invalid_attachment' using errcode = '22023';
  end if;

  new.body := nullif(btrim(new.body), '');
  if new.body is null and new.attachment_path is null then
    raise exception 'empty_message' using errcode = '22023';
  end if;

  perform public.check_rate_limit('message', 30, interval '1 minute');
  return new;
end;
$$;

revoke execute on function public.messages_before_insert() from public, anon, authenticated;

create trigger messages_before_insert
  before insert on public.messages
  for each row execute function public.messages_before_insert();

-- Bumps the conversation and marks it read for the sender.
create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;
  return null;
end;
$$;

revoke execute on function public.messages_after_insert() from public, anon, authenticated;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.messages_after_insert();

-- RPCs ---------------------------------------------------------------------------

create or replace function private.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = (select auth.uid());
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.mark_conversation_read(p_conversation_id);
$$;

-- delete_message: the sender soft-deletes their own message (kept for moderation history).
create or replace function private.delete_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.messages
  set deleted_at = now()
  where id = p_message_id and sender_id = (select auth.uid()) and deleted_at is null;
  if not found then
    raise exception 'message_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.delete_message(p_message_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.delete_message(p_message_id);
$$;

-- get_my_conversations: the other participant, last message and unread count. RLS applies (invoker).
create or replace function public.get_my_conversations()
returns table (
  conversation_id uuid,
  context_type public.conversation_context,
  context_id uuid,
  other_user_id uuid,
  other_name text,
  other_avatar_path text,
  last_message_at timestamptz,
  last_message_body text,
  last_message_has_attachment boolean,
  last_message_sender_id uuid,
  unread_count integer
)
language sql stable security invoker set search_path = ''
as $$
  select
    c.id, c.context_type, c.context_id,
    other.user_id, p.full_name, p.avatar_path,
    c.last_message_at,
    lm.body, lm.attachment_path is not null, lm.sender_id,
    (
      select count(*)::int from public.messages m
      where m.conversation_id = c.id
        and m.created_at > me.last_read_at
        and m.sender_id is distinct from me.user_id
    )
  from public.conversation_participants me
  join public.conversations c on c.id = me.conversation_id
  left join public.conversation_participants other
    on other.conversation_id = c.id and other.user_id <> me.user_id
  left join public.profiles p on p.id = other.user_id
  left join lateral (
    select m.body, m.attachment_path, m.sender_id
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where me.user_id = (select auth.uid())
  order by coalesce(c.last_message_at, c.created_at) desc;
$$;

revoke execute on function
  private.is_conversation_participant(uuid), private.is_conversation_participant_path(text),
  private.open_conversation(public.conversation_context, uuid, uuid, uuid),
  private.mark_conversation_read(uuid), private.delete_message(uuid)
  from public, anon, authenticated;
revoke execute on function
  public.mark_conversation_read(uuid), public.delete_message(uuid), public.get_my_conversations()
  from public, anon;
grant execute on function
  private.is_conversation_participant(uuid), private.is_conversation_participant_path(text),
  private.mark_conversation_read(uuid), private.delete_message(uuid)
  to authenticated;
grant execute on function
  public.mark_conversation_read(uuid), public.delete_message(uuid), public.get_my_conversations()
  to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations, public.conversation_participants, public.messages from anon, authenticated;

-- conversations and participants: read-only for participants (admins read for moderation).
grant select on public.conversations, public.conversation_participants to authenticated;

create policy conversations_select on public.conversations
  for select to authenticated
  using ((select private.is_conversation_participant(id)) or (select public.is_admin()));

create policy conversation_participants_select on public.conversation_participants
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_conversation_participant(conversation_id)
    or (select public.is_admin())
  );

-- messages: participants read messages that are not deleted or hidden; the sender inserts
-- (the trigger re-checks participation, blocks and the rate limit). No update or delete grant.
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body, attachment_path) on public.messages to authenticated;

create policy messages_select on public.messages
  for select to authenticated
  using (
    (deleted_at is null and hidden_at is null and private.is_conversation_participant(conversation_id))
    or (select public.is_admin())
  );

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.is_conversation_participant(conversation_id)
  );

-- Realtime: clients subscribe to messages filtered by conversation_id; RLS decides who receives rows.
alter publication supabase_realtime add table public.messages;

-- Storage: private "chat-attachments" bucket, '{conversation_id}/{uuid}.{ext}'. Participants only;
-- images are shown through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-attachments', 'chat-attachments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy chat_attachments_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-attachments' and private.is_conversation_participant_path((storage.foldername(name))[1]));

create policy chat_attachments_objects_select on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-attachments' and private.is_conversation_participant_path((storage.foldername(name))[1]));
