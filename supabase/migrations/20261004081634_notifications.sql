-- Phase 6 / M019 notifications (PRODUCT_SPEC §9, D-016).
-- notify() inserts a row with an email_status taken from the user's preferences; the dispatch-notifications
-- Edge Function (called by pg_cron) sends pending emails. Domain events call notify() from AFTER triggers,
-- so the RPCs that change state stay untouched. API roles cannot insert notifications.

create type public.notification_email_status as enum ('skipped', 'pending', 'sent', 'failed');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- e.g. application_status, session_update, contact_request, new_message, job_alert.
  type text not null check (char_length(type) between 1 and 50),
  title text not null check (char_length(title) between 1 and 200),
  body text check (char_length(body) <= 1000),
  -- In-app path to open, e.g. /applications/{id}.
  link text check (link ~ '^/' and char_length(link) <= 300),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  email_status public.notification_email_status not null default 'skipped',
  email_attempts smallint not null default 0,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_email_queue_idx on public.notifications (created_at) where email_status = 'pending';

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- WhatsApp opt-in already lives in profile_private.whatsapp_opt_in (D-011).
create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email_enabled boolean not null default true,
  -- Notification types the user does not want by email.
  email_muted_types text[] not null default '{}' check (cardinality(email_muted_types) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- notify: internal. p_dedupe skips the insert while the user still has an unread notification with the
-- same type and link (used for chat messages and interview slots, so a burst gives one alert).
create or replace function private.notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_data jsonb default '{}'::jsonb,
  p_dedupe boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email boolean;
begin
  if p_user_id is null or not exists (select 1 from public.profiles p where p.id = p_user_id) then
    return;
  end if;
  if p_dedupe and exists (
    select 1 from public.notifications n
    where n.user_id = p_user_id and n.type = p_type and n.link is not distinct from p_link and n.read_at is null
  ) then
    return;
  end if;

  select coalesce(
    (select np.email_enabled and not (p_type = any (np.email_muted_types))
     from public.notification_preferences np where np.user_id = p_user_id),
    true
  ) into v_email;

  insert into public.notifications (user_id, type, title, body, link, data, email_status)
  values (p_user_id, p_type, left(p_title, 200), left(p_body, 1000), p_link, coalesce(p_data, '{}'::jsonb),
          case when v_email then 'pending' else 'skipped' end::public.notification_email_status);
end;
$$;

revoke execute on function private.notify(uuid, text, text, text, text, jsonb, boolean) from public, anon, authenticated;

-- mark_notifications_read: all of the caller's unread notifications, or just the given ids.
create or replace function private.mark_notifications_read(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid()) and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language sql security invoker set search_path = ''
as $$
  select private.mark_notifications_read(p_ids);
$$;

revoke execute on function private.mark_notifications_read(uuid[]) from public, anon, authenticated;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function private.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Event triggers -------------------------------------------------------------------
-- One trigger function per table. All are definer and not executable by API roles.

create or replace function public.notify_job_applications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs;
begin
  select * into v_job from public.jobs j where j.id = new.job_id;
  if tg_op = 'INSERT' then
    perform private.notify(v_job.posted_by, 'application_received', 'New application',
      'Someone applied for "' || v_job.title || '".', '/employer/applications/' || new.id);
  elsif new.status is distinct from old.status then
    if new.status = 'withdrawn' then
      perform private.notify(v_job.posted_by, 'application_withdrawn', 'Application withdrawn',
        'An applicant withdrew from "' || v_job.title || '".', '/employer/jobs/' || new.job_id);
    else
      perform private.notify(new.applicant_id, 'application_status', 'Application update',
        'Your application for "' || v_job.title || '" is now: ' || replace(new.status::text, '_', ' ') || '.',
        '/applications/' || new.id);
    end if;
  end if;
  return null;
end;
$$;

create trigger job_applications_notify
  after insert or update of status on public.job_applications
  for each row execute function public.notify_job_applications();

create or replace function public.notify_interview_slots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_applicant uuid;
begin
  select a.applicant_id into v_applicant from public.job_applications a where a.id = new.application_id;
  if tg_op = 'INSERT' then
    perform private.notify(v_applicant, 'interview_slot', 'Interview times proposed',
      'The employer proposed interview times. Pick one that suits you.',
      '/applications/' || new.application_id, '{}'::jsonb, true);
  elsif new.status = 'selected' and old.status <> 'selected' then
    perform private.notify(new.proposed_by, 'interview_slot_picked', 'Interview time chosen',
      'The applicant picked an interview time.', '/employer/applications/' || new.application_id);
  end if;
  return null;
end;
$$;

create trigger interview_slots_notify
  after insert or update of status on public.interview_slots
  for each row execute function public.notify_interview_slots();

create or replace function public.notify_mentorship_sessions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(new.mentor_id, 'session_requested', 'New session request',
      'A mentee asked for a session with you.', '/mentor/sessions/' || new.id);
  elsif new.status is distinct from old.status then
    if new.status = 'confirmed' then
      perform private.notify(new.mentee_id, 'session_update', 'Session confirmed',
        'Your mentor confirmed the session. The meeting link is on the session page.', '/sessions/' || new.id);
    elsif new.status = 'declined' then
      perform private.notify(new.mentee_id, 'session_update', 'Session declined',
        'Your mentor could not take this session.', '/sessions/' || new.id);
    elsif new.status = 'cancelled' then
      if new.cancelled_by = new.mentee_id then
        perform private.notify(new.mentor_id, 'session_update', 'Session cancelled',
          'The mentee cancelled a session.', '/mentor/sessions/' || new.id);
      else
        perform private.notify(new.mentee_id, 'session_update', 'Session cancelled',
          'Your mentor cancelled the session.', '/sessions/' || new.id);
      end if;
    end if;
  end if;
  return null;
end;
$$;

create trigger mentorship_sessions_notify
  after insert or update of status on public.mentorship_sessions
  for each row execute function public.notify_mentorship_sessions();

create or replace function public.notify_relocation_offers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester uuid;
begin
  select r.user_id into v_requester from public.relocation_requests r where r.id = new.request_id;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') then
    perform private.notify(v_requester, 'relocation_offer', 'A buddy offered to help',
      'A Settle-In Buddy offered help with your move.', '/settle-in/' || new.request_id);
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    perform private.notify(new.buddy_id, 'offer_accepted', 'Your offer was accepted',
      'You can now chat with the newcomer.', '/buddy');
  end if;
  return null;
end;
$$;

create trigger relocation_offers_notify
  after insert or update of status on public.relocation_offers
  for each row execute function public.notify_relocation_offers();

create or replace function public.notify_flat_contact_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.flat_listings;
begin
  select * into v_listing from public.flat_listings l where l.id = new.listing_id;
  if tg_op = 'INSERT' then
    perform private.notify(v_listing.lister_id, 'contact_request', 'New contact request',
      'Someone is interested in "' || v_listing.title || '".', '/flats/mine');
  elsif new.status is distinct from old.status and new.status in ('accepted', 'declined') then
    perform private.notify(new.requester_id, 'contact_decided',
      case when new.status = 'accepted' then 'Contact request accepted' else 'Contact request declined' end,
      case when new.status = 'accepted'
        then 'You can now see the address of "' || v_listing.title || '" and chat with the lister.'
        else 'The lister of "' || v_listing.title || '" declined your request.' end,
      '/flats/' || new.listing_id);
  end if;
  return null;
end;
$$;

create trigger flat_contact_requests_notify
  after insert or update of status on public.flat_contact_requests
  for each row execute function public.notify_flat_contact_requests();

create or replace function public.notify_flatmate_connections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(new.recipient_id, 'flatmate_request', 'New flatmate request',
      'Someone wants to connect about sharing a flat.', '/flatmates/requests');
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    perform private.notify(new.requester_id, 'flatmate_accepted', 'Flatmate request accepted',
      'You can now chat with your match.', '/flatmates/requests');
  end if;
  return null;
end;
$$;

create trigger flatmate_connections_notify
  after insert or update of status on public.flatmate_connections
  for each row execute function public.notify_flatmate_connections();

create or replace function public.notify_verification_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform private.notify(new.user_id, 'verification_decided',
      case when new.status = 'approved' then 'Verification approved' else 'Verification not approved' end,
      case when new.status = 'approved' then 'Your verification request was approved.'
        else coalesce('Reason: ' || new.rejection_reason, 'Your verification request was not approved.') end,
      case new.kind
        when 'company' then '/employer'
        when 'mentor' then '/mentor'
        when 'buddy' then '/buddy'
        else '/flats/mine'
      end);
  end if;
  return null;
end;
$$;

create trigger verification_requests_notify
  after update of status on public.verification_requests
  for each row execute function public.notify_verification_requests();

create or replace function public.notify_jobs_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending_review' and new.status in ('published', 'draft') then
    perform private.notify(new.posted_by, 'job_reviewed',
      case when new.status = 'published' then 'Your job is live' else 'Your job was sent back' end,
      case when new.status = 'published' then '"' || new.title || '" was approved and is now published.'
        else '"' || new.title || '" needs changes before it can go live.' end,
      '/employer/jobs/' || new.id);
  end if;
  return null;
end;
$$;

create trigger jobs_notify_review
  after update of status on public.jobs
  for each row execute function public.notify_jobs_review();

create or replace function public.notify_place_suggestions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform private.notify(new.user_id, 'suggestion_decided',
      case when new.status = 'approved' then 'Place suggestion approved' else 'Place suggestion not approved' end,
      coalesce(new.review_note, 'Thank you for helping keep the directory up to date.'), '/places/suggest');
  end if;
  return null;
end;
$$;

create trigger place_suggestions_notify
  after update of status on public.place_suggestions
  for each row execute function public.notify_place_suggestions();

-- Chat: one alert per conversation while it stays unread.
create or replace function public.notify_messages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other uuid;
begin
  for v_other in
    select cp.user_id from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id and cp.user_id is distinct from new.sender_id
  loop
    perform private.notify(v_other, 'new_message', 'New message', 'You have a new message.',
      '/messages/' || new.conversation_id, '{}'::jsonb, true);
  end loop;
  return null;
end;
$$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_messages();

revoke execute on function
  public.notify_job_applications(), public.notify_interview_slots(), public.notify_mentorship_sessions(),
  public.notify_relocation_offers(), public.notify_flat_contact_requests(), public.notify_flatmate_connections(),
  public.notify_verification_requests(), public.notify_jobs_review(), public.notify_place_suggestions(),
  public.notify_messages()
  from public, anon, authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

revoke all on public.notifications, public.notification_preferences from anon, authenticated;

-- notifications: a user reads their own (marked read through mark_notifications_read) and may delete them.
grant select, delete on public.notifications to authenticated;

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- notification_preferences: private to the owner.
grant select on public.notification_preferences to authenticated;
grant insert (user_id, email_enabled, email_muted_types), update (email_enabled, email_muted_types)
  on public.notification_preferences to authenticated;

create policy notification_preferences_select on public.notification_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_preferences_insert on public.notification_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notification_preferences_update on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Realtime: the bell subscribes to the user's own notifications (RLS decides delivery).
alter publication supabase_realtime add table public.notifications;
