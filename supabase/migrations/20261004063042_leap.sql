-- Phase 3 / M011 LEAP programs, enrollments and badges (PRODUCT_SPEC §5, D-005, D-009, D-031).
-- Enrollment status changes only through RPCs (D-015): API roles have no insert/update grant on
-- leap_enrollments or leap_badges. Programs are admin-managed.

create type public.leap_program_type as enum ('workshop', 'training_course', 'internship', 'cohort');
create type public.program_mode as enum ('online', 'in_person');
create type public.leap_program_status as enum ('draft', 'open', 'closed', 'completed', 'cancelled');
create type public.enrollment_status as enum ('pending', 'enrolled', 'waitlisted', 'rejected', 'cancelled', 'completed');

create table public.leap_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 150),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 160),
  description text not null check (char_length(description) between 1 and 5000),
  program_type public.leap_program_type not null,
  mode public.program_mode not null,
  city_id uuid references public.cities (id) on delete set null,
  venue text check (char_length(venue) <= 300),
  start_date date not null,
  end_date date not null,
  -- Null = unlimited seats (never waitlists).
  capacity integer check (capacity is null or capacity between 1 and 10000),
  eligibility text check (char_length(eligibility) <= 1000),
  requires_approval boolean not null default false,
  status public.leap_program_status not null default 'draft',
  badge_name text not null check (char_length(badge_name) between 1 and 80),
  image_path text check (char_length(image_path) <= 300),
  -- Seats held by enrolled + completed participants. Maintained by a trigger, not writable by API roles.
  seats_taken integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (mode = 'online' or city_id is not null)
);

create index leap_programs_status_start_idx on public.leap_programs (status, start_date);
create index leap_programs_city_id_idx on public.leap_programs (city_id);
create index leap_programs_created_by_idx on public.leap_programs (created_by);

create trigger leap_programs_set_updated_at
  before update on public.leap_programs
  for each row execute function public.set_updated_at();

create trigger leap_programs_audit after insert or update or delete on public.leap_programs
  for each row execute function public.audit_admin_change();

create table public.leap_enrollments (
  id uuid primary key default gen_random_uuid(),
  -- Restrict: a program with enrollments is closed or cancelled, never deleted.
  program_id uuid not null references public.leap_programs (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.enrollment_status not null default 'pending',
  motivation text check (char_length(motivation) <= 1000),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_reason text check (char_length(decision_reason) <= 500),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, user_id)
);

create index leap_enrollments_user_id_idx on public.leap_enrollments (user_id, created_at desc);
create index leap_enrollments_program_status_idx on public.leap_enrollments (program_id, status, created_at);
create index leap_enrollments_decided_by_idx on public.leap_enrollments (decided_by);

create trigger leap_enrollments_set_updated_at
  before update on public.leap_enrollments
  for each row execute function public.set_updated_at();

create table public.leap_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.leap_programs (id) on delete restrict,
  awarded_by uuid references public.profiles (id) on delete set null,
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, program_id)
);

create index leap_badges_program_id_idx on public.leap_badges (program_id);
create index leap_badges_awarded_by_idx on public.leap_badges (awarded_by);

create trigger leap_badges_set_updated_at
  before update on public.leap_badges
  for each row execute function public.set_updated_at();

-- Helpers ------------------------------------------------------------------------

-- Keeps leap_programs.seats_taken in step with enrollments.
create or replace function public.leap_enrollments_sync_seats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program uuid := coalesce(new.program_id, old.program_id);
begin
  update public.leap_programs p
  set seats_taken = (
    select count(*) from public.leap_enrollments e
    where e.program_id = v_program and e.status in ('enrolled', 'completed')
  )
  where p.id = v_program;
  return null;
end;
$$;

revoke execute on function public.leap_enrollments_sync_seats() from public, anon, authenticated;

create trigger leap_enrollments_sync_seats
  after insert or update of status or delete on public.leap_enrollments
  for each row execute function public.leap_enrollments_sync_seats();

-- Moves the oldest waitlisted users into free seats. Called with the program row locked.
create or replace function private.leap_promote_waitlist(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_taken integer;
  v_free integer;
begin
  select p.capacity into v_capacity from public.leap_programs p where p.id = p_program_id;
  select count(*) into v_taken from public.leap_enrollments e
  where e.program_id = p_program_id and e.status in ('enrolled', 'completed');
  v_free := case when v_capacity is null then 2147483647 else v_capacity - v_taken end;
  if v_free <= 0 then
    return;
  end if;

  update public.leap_enrollments e
  set status = 'enrolled', decided_at = now()
  where e.id in (
    select w.id from public.leap_enrollments w
    where w.program_id = p_program_id and w.status = 'waitlisted'
    order by w.created_at
    limit v_free
  );
end;
$$;

-- An admin raising capacity (or removing it) promotes waitlisted users.
create or replace function public.leap_programs_after_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'open' and (new.capacity is null or new.capacity > coalesce(old.capacity, 0)) then
    perform private.leap_promote_waitlist(new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.leap_programs_after_capacity() from public, anon, authenticated;

create trigger leap_programs_after_capacity
  after update of capacity on public.leap_programs
  for each row execute function public.leap_programs_after_capacity();

-- A program with enrollments cannot go back to draft (it would vanish from its participants).
create or replace function public.leap_programs_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'draft' and old.status <> 'draft'
     and exists (select 1 from public.leap_enrollments e where e.program_id = new.id) then
    raise exception 'program_has_enrollments' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.leap_programs_before_update() from public, anon, authenticated;

create trigger leap_programs_before_update
  before update on public.leap_programs
  for each row execute function public.leap_programs_before_update();

-- RPCs ---------------------------------------------------------------------------

-- enroll_in_program: returns the new status: 'enrolled', 'waitlisted' or 'pending' (D-009).
-- A user who cancelled earlier may enroll again; a rejected user may not.
create or replace function private.enroll_in_program(p_program_id uuid, p_motivation text)
returns public.enrollment_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_program public.leap_programs;
  v_existing public.leap_enrollments;
  v_motivation text := nullif(btrim(coalesce(p_motivation, '')), '');
  v_status public.enrollment_status;
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
  if char_length(v_motivation) > 1000 then
    raise exception 'motivation_too_long' using errcode = '22023';
  end if;

  -- Lock the program so two users cannot take the last seat.
  select * into v_program from public.leap_programs p where p.id = p_program_id for update;
  if not found or v_program.status <> 'open' then
    raise exception 'program_not_open' using errcode = 'P0001';
  end if;
  if v_program.end_date < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'program_ended' using errcode = 'P0001';
  end if;

  select * into v_existing from public.leap_enrollments e
  where e.program_id = p_program_id and e.user_id = v_uid
  for update;
  if found and v_existing.status = 'rejected' then
    raise exception 'enrollment_rejected' using errcode = 'P0001';
  end if;
  if found and v_existing.status <> 'cancelled' then
    raise exception 'already_enrolled' using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('leap_enroll', 10, interval '1 day');

  v_status := case
    when v_program.requires_approval then 'pending'
    when v_program.capacity is null or v_program.seats_taken < v_program.capacity then 'enrolled'
    else 'waitlisted'
  end;

  if v_existing.id is not null then
    update public.leap_enrollments
    set status = v_status, motivation = v_motivation, decided_by = null, decided_at = null,
        decision_reason = null, completed_at = null, created_at = now()
    where id = v_existing.id;
  else
    insert into public.leap_enrollments (program_id, user_id, status, motivation)
    values (p_program_id, v_uid, v_status, v_motivation);
  end if;

  return v_status;
end;
$$;

create or replace function public.enroll_in_program(p_program_id uuid, p_motivation text default null)
returns public.enrollment_status
language sql security invoker set search_path = ''
as $$
  select private.enroll_in_program(p_program_id, p_motivation);
$$;

-- cancel_enrollment: the participant leaves; a freed seat goes to the oldest waitlisted user.
create or replace function private.cancel_enrollment(p_enrollment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.leap_enrollments;
begin
  select * into v_enrollment from public.leap_enrollments e
  where e.id = p_enrollment_id and e.user_id = (select auth.uid());
  if not found then
    raise exception 'enrollment_not_found' using errcode = 'P0002';
  end if;

  perform 1 from public.leap_programs p where p.id = v_enrollment.program_id for update;
  select * into v_enrollment from public.leap_enrollments e where e.id = p_enrollment_id for update;
  if v_enrollment.status not in ('pending', 'enrolled', 'waitlisted') then
    raise exception 'enrollment_closed' using errcode = 'P0001';
  end if;

  update public.leap_enrollments set status = 'cancelled' where id = p_enrollment_id;
  if v_enrollment.status = 'enrolled' then
    perform private.leap_promote_waitlist(v_enrollment.program_id);
  end if;
end;
$$;

create or replace function public.cancel_enrollment(p_enrollment_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.cancel_enrollment(p_enrollment_id);
$$;

-- admin_decide_enrollment: approve or reject a pending (or waitlisted) enrollment.
-- Approving takes a seat if one is free, otherwise the user is waitlisted.
create or replace function private.admin_decide_enrollment(p_enrollment_id uuid, p_approve boolean, p_reason text)
returns public.enrollment_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.leap_enrollments;
  v_program public.leap_programs;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status public.enrollment_status;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if char_length(v_reason) > 500 then
    raise exception 'reason_too_long' using errcode = '22023';
  end if;

  select * into v_enrollment from public.leap_enrollments e where e.id = p_enrollment_id;
  if not found then
    raise exception 'enrollment_not_found' using errcode = 'P0002';
  end if;
  select * into v_program from public.leap_programs p where p.id = v_enrollment.program_id for update;
  select * into v_enrollment from public.leap_enrollments e where e.id = p_enrollment_id for update;

  if v_enrollment.status not in ('pending', 'waitlisted') then
    raise exception 'enrollment_already_decided' using errcode = 'P0001';
  end if;

  if not p_approve then
    v_status := 'rejected';
  elsif v_program.capacity is null or v_program.seats_taken < v_program.capacity then
    v_status := 'enrolled';
  else
    v_status := 'waitlisted';
  end if;

  if v_status <> v_enrollment.status then
    update public.leap_enrollments
    set status = v_status, decided_by = (select auth.uid()), decided_at = now(), decision_reason = v_reason
    where id = p_enrollment_id;
  end if;

  perform public.log_admin_action(
    case when p_approve then 'enrollment_approved' else 'enrollment_rejected' end,
    'leap_enrollments', p_enrollment_id,
    jsonb_build_object('program_id', v_enrollment.program_id, 'user_id', v_enrollment.user_id,
                       'status', v_status, 'reason', v_reason)
  );
  return v_status;
end;
$$;

create or replace function public.admin_decide_enrollment(p_enrollment_id uuid, p_approve boolean, p_reason text default null)
returns public.enrollment_status
language sql security invoker set search_path = ''
as $$
  select private.admin_decide_enrollment(p_enrollment_id, p_approve, p_reason);
$$;

-- admin_complete_enrollment: marks an enrolled participant as completed and awards the program badge.
create or replace function private.admin_complete_enrollment(p_enrollment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.leap_enrollments;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;

  select * into v_enrollment from public.leap_enrollments e where e.id = p_enrollment_id for update;
  if not found then
    raise exception 'enrollment_not_found' using errcode = 'P0002';
  end if;
  if v_enrollment.status <> 'enrolled' then
    raise exception 'not_enrolled' using errcode = 'P0001';
  end if;

  update public.leap_enrollments
  set status = 'completed', completed_at = now()
  where id = p_enrollment_id;

  insert into public.leap_badges (user_id, program_id, awarded_by)
  values (v_enrollment.user_id, v_enrollment.program_id, (select auth.uid()))
  on conflict (user_id, program_id) do nothing;

  perform public.log_admin_action(
    'enrollment_completed', 'leap_enrollments', p_enrollment_id,
    jsonb_build_object('program_id', v_enrollment.program_id, 'user_id', v_enrollment.user_id)
  );
end;
$$;

create or replace function public.admin_complete_enrollment(p_enrollment_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.admin_complete_enrollment(p_enrollment_id);
$$;

revoke execute on function
  private.leap_promote_waitlist(uuid),
  private.enroll_in_program(uuid, text), private.cancel_enrollment(uuid),
  private.admin_decide_enrollment(uuid, boolean, text), private.admin_complete_enrollment(uuid)
  from public, anon, authenticated;
revoke execute on function
  public.enroll_in_program(uuid, text), public.cancel_enrollment(uuid),
  public.admin_decide_enrollment(uuid, boolean, text), public.admin_complete_enrollment(uuid)
  from public, anon;
grant execute on function
  private.enroll_in_program(uuid, text), private.cancel_enrollment(uuid),
  private.admin_decide_enrollment(uuid, boolean, text), private.admin_complete_enrollment(uuid)
  to authenticated;
grant execute on function
  public.enroll_in_program(uuid, text), public.cancel_enrollment(uuid),
  public.admin_decide_enrollment(uuid, boolean, text), public.admin_complete_enrollment(uuid)
  to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.leap_programs enable row level security;
alter table public.leap_enrollments enable row level security;
alter table public.leap_badges enable row level security;

revoke all on public.leap_programs, public.leap_enrollments, public.leap_badges from anon, authenticated;

-- leap_programs: public sees everything except drafts (D-012). Admins manage them.
-- seats_taken and created_by are not in the update grant.
grant select on public.leap_programs to anon, authenticated;
grant insert (title, slug, description, program_type, mode, city_id, venue, start_date, end_date, capacity,
  eligibility, requires_approval, status, badge_name, image_path, created_by) on public.leap_programs to authenticated;
grant update (title, slug, description, program_type, mode, city_id, venue, start_date, end_date, capacity,
  eligibility, requires_approval, status, badge_name, image_path) on public.leap_programs to authenticated;
grant delete on public.leap_programs to authenticated;

create policy leap_programs_select_public on public.leap_programs
  for select to anon
  using (status <> 'draft');
create policy leap_programs_select on public.leap_programs
  for select to authenticated
  using (status <> 'draft' or (select public.is_admin()));
create policy leap_programs_insert on public.leap_programs
  for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));
create policy leap_programs_update on public.leap_programs
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy leap_programs_delete on public.leap_programs
  for delete to authenticated
  using ((select public.is_admin()) and status = 'draft');

-- leap_enrollments: read-only for API roles. Users see their own; admins see all.
grant select on public.leap_enrollments to authenticated;

create policy leap_enrollments_select on public.leap_enrollments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- leap_badges: shown on profiles, so any signed-in user can read them unless either side blocked the other.
-- Awarded only by admin_complete_enrollment(); admins may revoke one.
grant select, delete on public.leap_badges to authenticated;

create policy leap_badges_select on public.leap_badges
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or not public.is_blocked_between((select auth.uid()), user_id)
  );
create policy leap_badges_delete on public.leap_badges
  for delete to authenticated
  using ((select public.is_admin()));

-- Storage: public "leap-assets" bucket for program images, '{program_id}/{uuid}.{ext}'. Admin-only writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('leap-assets', 'leap-assets', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy leap_assets_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'leap-assets' and (select public.is_admin()));

create policy leap_assets_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'leap-assets' and (select public.is_admin()));
