-- Phase 3 / M012 mentorship: mentor profiles, availability, sessions, feedback, private notes
-- (PRODUCT_SPEC §6, D-014, D-015, D-032).
-- Session status changes only through RPCs (D-015): API roles have no insert/update grant on
-- mentorship_sessions or session_feedback.

create type public.session_type as enum ('career_guidance', 'cv_review', 'mock_interview', 'skill_roadmap', 'industry_qa');
create type public.session_status as enum ('requested', 'confirmed', 'declined', 'cancelled', 'completed');
create type public.availability_exception_kind as enum ('unavailable', 'extra');
create type public.session_side as enum ('mentee', 'mentor');

-- Mentor profiles ----------------------------------------------------------------

create table public.mentor_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text not null check (char_length(headline) between 3 and 120),
  bio text check (char_length(bio) <= 2000),
  industries text[] not null default '{}' check (cardinality(industries) <= 10),
  years_experience integer not null check (years_experience between 0 and 60),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  city_id uuid references public.cities (id) on delete set null,
  -- IANA name; availability rules are interpreted in this zone. Validated by a trigger.
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) <= 64),
  session_types public.session_type[] not null default '{career_guidance}'
    check (cardinality(session_types) between 1 and 5),
  default_duration_min integer not null default 30 check (default_duration_min in (30, 60)),
  is_accepting boolean not null default true,
  -- Set by admin_review_verification(); not in the update grant.
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  -- Kept current by a trigger on session_feedback; not in the update grant.
  rating_avg numeric(3, 2),
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mentor_profiles_listing_idx on public.mentor_profiles (verification_status, is_accepting, city_id);
create index mentor_profiles_city_id_idx on public.mentor_profiles (city_id);
create index mentor_profiles_session_types_idx on public.mentor_profiles using gin (session_types);

create trigger mentor_profiles_set_updated_at
  before update on public.mentor_profiles
  for each row execute function public.set_updated_at();

create table public.mentor_skills (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentor_profiles (user_id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mentor_id, skill_id)
);

create index mentor_skills_skill_id_idx on public.mentor_skills (skill_id);

create trigger mentor_skills_set_updated_at
  before update on public.mentor_skills
  for each row execute function public.set_updated_at();

-- Availability: weekly rules plus one-off exceptions, in the mentor's time zone.
create table public.mentor_availability_rules (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentor_profiles (user_id) on delete cascade,
  -- 0 = Sunday … 6 = Saturday (same as extract(dow)).
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index mentor_availability_rules_mentor_idx on public.mentor_availability_rules (mentor_id, weekday);

create trigger mentor_availability_rules_set_updated_at
  before update on public.mentor_availability_rules
  for each row execute function public.set_updated_at();

create table public.mentor_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentor_profiles (user_id) on delete cascade,
  on_date date not null,
  kind public.availability_exception_kind not null,
  -- Null times on an 'unavailable' exception block the whole day.
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((start_time is null) = (end_time is null)),
  check (start_time is null or end_time > start_time),
  check (kind = 'unavailable' or start_time is not null)
);

create index mentor_availability_exceptions_mentor_idx on public.mentor_availability_exceptions (mentor_id, on_date);

create trigger mentor_availability_exceptions_set_updated_at
  before update on public.mentor_availability_exceptions
  for each row execute function public.set_updated_at();

-- Sessions -----------------------------------------------------------------------

create table public.mentorship_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentor_profiles (user_id) on delete cascade,
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  session_type public.session_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.session_status not null default 'requested',
  goal_note text check (char_length(goal_note) <= 1000),
  meeting_url text check (meeting_url ~ '^https://' and char_length(meeting_url) <= 500),
  decline_reason text check (char_length(decline_reason) <= 500),
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancel_reason text check (char_length(cancel_reason) <= 500),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mentor_id <> mentee_id),
  check (ends_at - starts_at in (interval '30 minutes', interval '60 minutes')),
  check (status <> 'confirmed' or meeting_url is not null),
  -- A mentor's requested or confirmed sessions never overlap.
  constraint mentorship_sessions_no_overlap exclude using gist (
    mentor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('requested', 'confirmed'))
);

create index mentorship_sessions_mentor_idx on public.mentorship_sessions (mentor_id, starts_at);
create index mentorship_sessions_mentee_idx on public.mentorship_sessions (mentee_id, starts_at);
create index mentorship_sessions_cancelled_by_idx on public.mentorship_sessions (cancelled_by);

create trigger mentorship_sessions_set_updated_at
  before update on public.mentorship_sessions
  for each row execute function public.set_updated_at();

create table public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mentorship_sessions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_side public.session_side not null,
  -- Required from the mentee, never from the mentor.
  rating smallint check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  -- Recommended next steps, mentor only.
  next_steps text check (char_length(next_steps) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, author_id),
  check ((author_side = 'mentee') = (rating is not null)),
  check (author_side = 'mentor' or next_steps is null)
);

create index session_feedback_author_id_idx on public.session_feedback (author_id);

create trigger session_feedback_set_updated_at
  before update on public.session_feedback
  for each row execute function public.set_updated_at();

-- Mentor-only notes about a session. Never visible to the mentee.
create table public.mentor_private_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mentorship_sessions (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mentor_private_notes_session_idx on public.mentor_private_notes (session_id, created_at);
create index mentor_private_notes_mentor_id_idx on public.mentor_private_notes (mentor_id);

create trigger mentor_private_notes_set_updated_at
  before update on public.mentor_private_notes
  for each row execute function public.set_updated_at();

-- Helpers (definer, so policies do not recurse through each other's RLS) ----------

-- A mentor is listed when approved, accepting and not suspended, and the caller has no block with them.
create or replace function private.is_mentor_listed(p_mentor_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.mentor_profiles m
    join public.profiles p on p.id = m.user_id
    where m.user_id = p_mentor_id
      and m.verification_status = 'approved'
      and m.is_accepting
      and p.suspended_at is null
      and not private.is_blocked_between((select auth.uid()), m.user_id)
  );
$$;

create or replace function private.is_session_participant(p_session_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.mentorship_sessions s
    where s.id = p_session_id and (select auth.uid()) in (s.mentor_id, s.mentee_id)
  );
$$;

create or replace function private.is_session_mentor(p_session_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.mentorship_sessions s
    where s.id = p_session_id and s.mentor_id = (select auth.uid())
  );
$$;

-- Free bookable slots for a mentor between two dates (in the mentor's time zone).
-- Slots start 12 hours to 30 days from now (D-032), skip unavailable exceptions and the mentor's
-- requested/confirmed sessions. Reveals only free times, never other people's bookings.
create or replace function private.mentor_free_slots(p_mentor_id uuid, p_from date, p_to date)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with m as (
    select mp.user_id, mp.timezone, make_interval(mins => mp.default_duration_min) as dur
    from public.mentor_profiles mp
    where mp.user_id = p_mentor_id
  ),
  days as (
    select d::date as day
    from generate_series(p_from::timestamp, least(p_to, p_from + 31)::timestamp, interval '1 day') as g (d)
  ),
  windows as (
    select dy.day, r.start_time, r.end_time
    from days dy
    join public.mentor_availability_rules r on r.mentor_id = p_mentor_id and r.weekday = extract(dow from dy.day)
    union
    select e.on_date, e.start_time, e.end_time
    from public.mentor_availability_exceptions e
    join days dy on dy.day = e.on_date
    where e.mentor_id = p_mentor_id and e.kind = 'extra'
  ),
  local_slots as (
    select distinct w.day, (w.day + w.start_time) + m.dur * k.n as local_start, m.dur
    from windows w
    cross join m
    cross join lateral generate_series(
      0,
      floor(extract(epoch from (w.end_time - w.start_time)) / extract(epoch from m.dur))::int - 1
    ) as k (n)
  ),
  slots as (
    select ls.day, ls.local_start, ls.local_start + ls.dur as local_end,
           ls.local_start at time zone m.timezone as s_at,
           (ls.local_start + ls.dur) at time zone m.timezone as e_at
    from local_slots ls cross join m
  )
  select s.s_at, s.e_at
  from slots s
  where s.s_at >= now() + interval '12 hours'
    and s.s_at <= now() + interval '30 days'
    and not exists (
      select 1 from public.mentor_availability_exceptions e
      where e.mentor_id = p_mentor_id and e.kind = 'unavailable' and e.on_date = s.day
        and (e.start_time is null
             or (s.local_start < s.day + e.end_time and s.local_end > s.day + e.start_time))
    )
    and not exists (
      select 1 from public.mentorship_sessions ms
      where ms.mentor_id = p_mentor_id and ms.status in ('requested', 'confirmed')
        and tstzrange(ms.starts_at, ms.ends_at) && tstzrange(s.s_at, s.e_at)
    )
  order by s.s_at;
$$;

-- Mentor profile rules: valid time zone; the mentor role and a verification request are added on creation,
-- and an already-approved request carries over.
create or replace function public.mentor_profiles_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest public.verification_status;
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names t where t.name = new.timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    insert into public.user_roles (user_id, role) values (new.user_id, 'mentor')
    on conflict (user_id, role) do nothing;

    select vr.status into v_latest
    from public.verification_requests vr
    where vr.user_id = new.user_id and vr.kind = 'mentor'
    order by vr.created_at desc
    limit 1;

    if v_latest is null or v_latest = 'rejected' then
      insert into public.verification_requests (user_id, kind) values (new.user_id, 'mentor');
      v_latest := 'pending';
    end if;
    new.verification_status := v_latest;
    new.verified_at := case when v_latest = 'approved' then now() end;
    new.rating_avg := null;
    new.rating_count := 0;
  end if;
  return new;
end;
$$;

revoke execute on function public.mentor_profiles_before_write() from public, anon, authenticated;

create trigger mentor_profiles_before_write
  before insert or update on public.mentor_profiles
  for each row execute function public.mentor_profiles_before_write();

-- A mentee holds at most 2 upcoming requested/confirmed sessions (PRODUCT_SPEC §6).
create or replace function public.mentorship_sessions_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('requested', 'confirmed') and new.starts_at > now() then
    perform pg_advisory_xact_lock(hashtextextended('mentee_sessions:' || new.mentee_id::text, 0));
    if (
      select count(*) from public.mentorship_sessions s
      where s.mentee_id = new.mentee_id
        and s.id <> new.id
        and s.status in ('requested', 'confirmed')
        and s.starts_at > now()
    ) >= 2 then
      raise exception 'session_limit_reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.mentorship_sessions_enforce_limit() from public, anon, authenticated;

create trigger mentorship_sessions_enforce_limit
  before insert or update of status on public.mentorship_sessions
  for each row execute function public.mentorship_sessions_enforce_limit();

-- Keeps mentor_profiles.rating_avg / rating_count current from mentee feedback.
create or replace function public.session_feedback_sync_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mentor uuid;
begin
  select s.mentor_id into v_mentor
  from public.mentorship_sessions s
  where s.id = coalesce(new.session_id, old.session_id);
  if v_mentor is null then
    return null;
  end if;

  update public.mentor_profiles m
  set (rating_avg, rating_count) = (
    select round(avg(f.rating)::numeric, 2), count(f.rating)::int
    from public.session_feedback f
    join public.mentorship_sessions s on s.id = f.session_id
    where s.mentor_id = v_mentor and f.author_side = 'mentee'
  )
  where m.user_id = v_mentor;
  return null;
end;
$$;

revoke execute on function public.session_feedback_sync_rating() from public, anon, authenticated;

create trigger session_feedback_sync_rating
  after insert or update or delete on public.session_feedback
  for each row execute function public.session_feedback_sync_rating();

-- RPCs ---------------------------------------------------------------------------

create or replace function private.get_mentor_slots(p_mentor_id uuid, p_from date, p_to date)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  if not private.is_mentor_listed(p_mentor_id) then
    return;
  end if;
  return query select f.starts_at, f.ends_at from private.mentor_free_slots(p_mentor_id, p_from, p_to) f;
end;
$$;

create or replace function public.get_mentor_slots(p_mentor_id uuid, p_from date, p_to date)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security invoker set search_path = ''
as $$
  select * from private.get_mentor_slots(p_mentor_id, p_from, p_to);
$$;

-- book_session: the mentee requests one of the mentor's free slots.
create or replace function private.book_session(
  p_mentor_id uuid,
  p_session_type public.session_type,
  p_starts_at timestamptz,
  p_goal_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_mentor public.mentor_profiles;
  v_note text := nullif(btrim(coalesce(p_goal_note, '')), '');
  v_local_day date;
  v_ends_at timestamptz;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_uid and p.onboarding_completed_at is not null and p.suspended_at is null
  ) then
    raise exception 'onboarding_required' using errcode = 'P0001';
  end if;
  if p_mentor_id = v_uid then
    raise exception 'cannot_book_self' using errcode = 'P0001';
  end if;
  if not private.is_mentor_listed(p_mentor_id) then
    raise exception 'mentor_not_available' using errcode = 'P0001';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'goal_note_too_long' using errcode = '22023';
  end if;

  select * into v_mentor from public.mentor_profiles m where m.user_id = p_mentor_id;
  if p_session_type is null or not (p_session_type = any (v_mentor.session_types)) then
    raise exception 'session_type_not_offered' using errcode = '22023';
  end if;

  v_local_day := (p_starts_at at time zone v_mentor.timezone)::date;
  select f.ends_at into v_ends_at
  from private.mentor_free_slots(p_mentor_id, v_local_day, v_local_day) f
  where f.starts_at = p_starts_at;
  if v_ends_at is null then
    raise exception 'slot_not_available' using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('session_request', 10, interval '1 day');

  begin
    insert into public.mentorship_sessions (mentor_id, mentee_id, session_type, starts_at, ends_at, goal_note)
    values (p_mentor_id, v_uid, p_session_type, p_starts_at, v_ends_at, v_note)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot_not_available' using errcode = 'P0001';
  end;

  return v_id;
end;
$$;

create or replace function public.book_session(
  p_mentor_id uuid,
  p_session_type public.session_type,
  p_starts_at timestamptz,
  p_goal_note text default null
)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.book_session(p_mentor_id, p_session_type, p_starts_at, p_goal_note);
$$;

-- respond_to_session: the mentor accepts (with a meeting link) or declines a request.
create or replace function private.respond_to_session(
  p_session_id uuid,
  p_accept boolean,
  p_meeting_url text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.mentorship_sessions;
  v_url text := nullif(btrim(coalesce(p_meeting_url, '')), '');
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_session from public.mentorship_sessions s
  where s.id = p_session_id and s.mentor_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if v_session.status <> 'requested' or v_session.starts_at <= now() then
    raise exception 'session_not_pending' using errcode = 'P0001';
  end if;

  if p_accept then
    if v_url is null or v_url !~ '^https://' or char_length(v_url) > 500 then
      raise exception 'invalid_meeting_url' using errcode = '22023';
    end if;
    update public.mentorship_sessions
    set status = 'confirmed', meeting_url = v_url, responded_at = now()
    where id = p_session_id;
  else
    if char_length(v_reason) > 500 then
      raise exception 'reason_too_long' using errcode = '22023';
    end if;
    update public.mentorship_sessions
    set status = 'declined', decline_reason = v_reason, responded_at = now()
    where id = p_session_id;
  end if;
end;
$$;

create or replace function public.respond_to_session(
  p_session_id uuid,
  p_accept boolean,
  p_meeting_url text default null,
  p_reason text default null
)
returns void
language sql security invoker set search_path = ''
as $$
  select private.respond_to_session(p_session_id, p_accept, p_meeting_url, p_reason);
$$;

-- cancel_session: either side cancels a requested or confirmed session before it starts.
create or replace function private.cancel_session(p_session_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.mentorship_sessions;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_session from public.mentorship_sessions s
  where s.id = p_session_id and v_uid in (s.mentor_id, s.mentee_id)
  for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if v_session.status not in ('requested', 'confirmed') or v_session.starts_at <= now() then
    raise exception 'session_not_cancellable' using errcode = 'P0001';
  end if;
  if char_length(v_reason) > 500 then
    raise exception 'reason_too_long' using errcode = '22023';
  end if;

  update public.mentorship_sessions
  set status = 'cancelled', cancelled_by = v_uid, cancel_reason = v_reason
  where id = p_session_id;
end;
$$;

create or replace function public.cancel_session(p_session_id uuid, p_reason text default null)
returns void
language sql security invoker set search_path = ''
as $$
  select private.cancel_session(p_session_id, p_reason);
$$;

-- submit_session_feedback: once a confirmed session has ended, each side leaves feedback once.
-- The mentee must rate (1–5); the mentor may add next steps. The first feedback completes the session.
create or replace function private.submit_session_feedback(
  p_session_id uuid,
  p_rating smallint,
  p_comment text,
  p_next_steps text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.mentorship_sessions;
  v_side public.session_side;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_next text := nullif(btrim(coalesce(p_next_steps, '')), '');
begin
  select * into v_session from public.mentorship_sessions s
  where s.id = p_session_id and v_uid in (s.mentor_id, s.mentee_id)
  for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if v_session.status not in ('confirmed', 'completed') or v_session.ends_at > now() then
    raise exception 'session_not_finished' using errcode = 'P0001';
  end if;

  v_side := case when v_uid = v_session.mentee_id then 'mentee' else 'mentor' end;
  if v_side = 'mentee' and (p_rating is null or p_rating not between 1 and 5) then
    raise exception 'rating_required' using errcode = '22023';
  end if;
  if v_side = 'mentee' and v_next is not null then
    raise exception 'next_steps_mentor_only' using errcode = '22023';
  end if;
  if char_length(v_comment) > 1000 or char_length(v_next) > 2000 then
    raise exception 'feedback_too_long' using errcode = '22023';
  end if;
  if exists (select 1 from public.session_feedback f where f.session_id = p_session_id and f.author_id = v_uid) then
    raise exception 'feedback_already_given' using errcode = 'P0001';
  end if;

  insert into public.session_feedback (session_id, author_id, author_side, rating, comment, next_steps)
  values (p_session_id, v_uid, v_side, case when v_side = 'mentee' then p_rating end, v_comment, v_next);

  if v_session.status = 'confirmed' then
    update public.mentorship_sessions set status = 'completed' where id = p_session_id;
  end if;
end;
$$;

create or replace function public.submit_session_feedback(
  p_session_id uuid,
  p_rating smallint default null,
  p_comment text default null,
  p_next_steps text default null
)
returns void
language sql security invoker set search_path = ''
as $$
  select private.submit_session_feedback(p_session_id, p_rating, p_comment, p_next_steps);
$$;

-- request_mentor_verification: after a rejection, the mentor asks for review again.
create or replace function private.request_mentor_verification(p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not exists (
    select 1 from public.mentor_profiles m where m.user_id = v_uid and m.verification_status = 'rejected'
  ) then
    raise exception 'not_rejected' using errcode = 'P0001';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;

  insert into public.verification_requests (user_id, kind, applicant_note) values (v_uid, 'mentor', v_note);
  update public.mentor_profiles set verification_status = 'pending', verified_at = null where user_id = v_uid;
end;
$$;

create or replace function public.request_mentor_verification(p_note text default null)
returns void
language sql security invoker set search_path = ''
as $$
  select private.request_mentor_verification(p_note);
$$;

-- admin_review_verification: now also updates the mentor profile for 'mentor' requests.
create or replace function private.admin_review_verification(p_request_id uuid, p_approve boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.verification_requests;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status public.verification_status := case when p_approve then 'approved' else 'rejected' end;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;

  select * into v_req from public.verification_requests r where r.id = p_request_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'request_already_decided' using errcode = 'P0001';
  end if;
  if not p_approve and v_reason is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  update public.verification_requests
  set status = v_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      rejection_reason = case when p_approve then null else v_reason end
  where id = p_request_id;

  if v_req.kind = 'company' then
    update public.companies
    set verification_status = v_status,
        verified_at = case when p_approve then now() end
    where id = v_req.subject_id;
  elsif v_req.kind = 'mentor' then
    update public.mentor_profiles
    set verification_status = v_status,
        verified_at = case when p_approve then now() end
    where user_id = v_req.user_id;
  end if;

  perform public.log_admin_action(
    case when p_approve then 'verification_approved' else 'verification_rejected' end,
    'verification_requests', p_request_id,
    jsonb_build_object('kind', v_req.kind, 'subject_id', v_req.subject_id, 'user_id', v_req.user_id, 'reason', v_reason)
  );
end;
$$;

revoke execute on function
  private.is_mentor_listed(uuid), private.is_session_participant(uuid), private.is_session_mentor(uuid),
  private.mentor_free_slots(uuid, date, date),
  private.get_mentor_slots(uuid, date, date),
  private.book_session(uuid, public.session_type, timestamptz, text),
  private.respond_to_session(uuid, boolean, text, text), private.cancel_session(uuid, text),
  private.submit_session_feedback(uuid, smallint, text, text), private.request_mentor_verification(text)
  from public, anon, authenticated;
revoke execute on function
  public.get_mentor_slots(uuid, date, date),
  public.book_session(uuid, public.session_type, timestamptz, text),
  public.respond_to_session(uuid, boolean, text, text), public.cancel_session(uuid, text),
  public.submit_session_feedback(uuid, smallint, text, text), public.request_mentor_verification(text)
  from public, anon;
grant execute on function
  private.is_mentor_listed(uuid), private.is_session_participant(uuid), private.is_session_mentor(uuid),
  private.get_mentor_slots(uuid, date, date),
  private.book_session(uuid, public.session_type, timestamptz, text),
  private.respond_to_session(uuid, boolean, text, text), private.cancel_session(uuid, text),
  private.submit_session_feedback(uuid, smallint, text, text), private.request_mentor_verification(text)
  to authenticated;
grant execute on function
  public.get_mentor_slots(uuid, date, date),
  public.book_session(uuid, public.session_type, timestamptz, text),
  public.respond_to_session(uuid, boolean, text, text), public.cancel_session(uuid, text),
  public.submit_session_feedback(uuid, smallint, text, text), public.request_mentor_verification(text)
  to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.mentor_profiles enable row level security;
alter table public.mentor_skills enable row level security;
alter table public.mentor_availability_rules enable row level security;
alter table public.mentor_availability_exceptions enable row level security;
alter table public.mentorship_sessions enable row level security;
alter table public.session_feedback enable row level security;
alter table public.mentor_private_notes enable row level security;

revoke all on public.mentor_profiles, public.mentor_skills, public.mentor_availability_rules,
  public.mentor_availability_exceptions, public.mentorship_sessions, public.session_feedback,
  public.mentor_private_notes from anon, authenticated;

-- mentor_profiles: signed-in users see listed mentors (D-012) and mentors they have a session with.
-- Verification and rating columns are not writable by API roles.
-- No delete: a mentor pauses with is_accepting, so past sessions keep their history.
grant select on public.mentor_profiles to authenticated;
grant insert (user_id, headline, bio, industries, years_experience, languages, city_id, timezone,
  session_types, default_duration_min, is_accepting) on public.mentor_profiles to authenticated;
grant update (headline, bio, industries, years_experience, languages, city_id, timezone,
  session_types, default_duration_min, is_accepting) on public.mentor_profiles to authenticated;

create policy mentor_profiles_select on public.mentor_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or private.is_mentor_listed(user_id)
    or exists (
      select 1 from public.mentorship_sessions s
      where s.mentor_id = mentor_profiles.user_id and s.mentee_id = (select auth.uid())
    )
  );
create policy mentor_profiles_insert on public.mentor_profiles
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.onboarding_completed_at is not null and p.suspended_at is null
    )
  );
create policy mentor_profiles_update on public.mentor_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- mentor_skills: readable with the mentor profile; the mentor manages their own.
grant select, delete on public.mentor_skills to authenticated;
grant insert (mentor_id, skill_id) on public.mentor_skills to authenticated;

create policy mentor_skills_select on public.mentor_skills
  for select to authenticated
  using (mentor_id = (select auth.uid()) or (select public.is_admin()) or private.is_mentor_listed(mentor_id));
create policy mentor_skills_insert on public.mentor_skills
  for insert to authenticated with check (mentor_id = (select auth.uid()));
create policy mentor_skills_delete on public.mentor_skills
  for delete to authenticated using (mentor_id = (select auth.uid()));

-- Availability: the mentor and admins only. Others see free slots through get_mentor_slots().
grant select, delete on public.mentor_availability_rules, public.mentor_availability_exceptions to authenticated;
grant insert (mentor_id, weekday, start_time, end_time),
  update (weekday, start_time, end_time) on public.mentor_availability_rules to authenticated;
grant insert (mentor_id, on_date, kind, start_time, end_time),
  update (on_date, kind, start_time, end_time) on public.mentor_availability_exceptions to authenticated;

create policy mentor_availability_rules_select on public.mentor_availability_rules
  for select to authenticated using (mentor_id = (select auth.uid()) or (select public.is_admin()));
create policy mentor_availability_rules_insert on public.mentor_availability_rules
  for insert to authenticated with check (mentor_id = (select auth.uid()));
create policy mentor_availability_rules_update on public.mentor_availability_rules
  for update to authenticated
  using (mentor_id = (select auth.uid())) with check (mentor_id = (select auth.uid()));
create policy mentor_availability_rules_delete on public.mentor_availability_rules
  for delete to authenticated using (mentor_id = (select auth.uid()));

create policy mentor_availability_exceptions_select on public.mentor_availability_exceptions
  for select to authenticated using (mentor_id = (select auth.uid()) or (select public.is_admin()));
create policy mentor_availability_exceptions_insert on public.mentor_availability_exceptions
  for insert to authenticated with check (mentor_id = (select auth.uid()));
create policy mentor_availability_exceptions_update on public.mentor_availability_exceptions
  for update to authenticated
  using (mentor_id = (select auth.uid())) with check (mentor_id = (select auth.uid()));
create policy mentor_availability_exceptions_delete on public.mentor_availability_exceptions
  for delete to authenticated using (mentor_id = (select auth.uid()));

-- mentorship_sessions: read-only for API roles; only the two participants (and admins) see a session.
grant select on public.mentorship_sessions to authenticated;

create policy mentorship_sessions_select on public.mentorship_sessions
  for select to authenticated
  using ((select auth.uid()) in (mentor_id, mentee_id) or (select public.is_admin()));

-- session_feedback: both participants read both sides; written only by submit_session_feedback().
grant select on public.session_feedback to authenticated;

create policy session_feedback_select on public.session_feedback
  for select to authenticated
  using ((select private.is_session_participant(session_id)) or (select public.is_admin()));

-- mentor_private_notes: the session's mentor only.
grant select, delete on public.mentor_private_notes to authenticated;
grant insert (session_id, mentor_id, body), update (body) on public.mentor_private_notes to authenticated;

create policy mentor_private_notes_select on public.mentor_private_notes
  for select to authenticated
  using (mentor_id = (select auth.uid()) or (select public.is_admin()));
create policy mentor_private_notes_insert on public.mentor_private_notes
  for insert to authenticated
  with check (mentor_id = (select auth.uid()) and (select private.is_session_mentor(session_id)));
create policy mentor_private_notes_update on public.mentor_private_notes
  for update to authenticated
  using (mentor_id = (select auth.uid())) with check (mentor_id = (select auth.uid()));
create policy mentor_private_notes_delete on public.mentor_private_notes
  for delete to authenticated
  using (mentor_id = (select auth.uid()));
