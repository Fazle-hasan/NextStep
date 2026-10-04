-- Phase 2 / M009 applications, answers, status history, employer notes, interview slots, referrals.
-- Application status changes only through RPCs (D-015): API roles have no insert/update grant on job_applications.

create type public.application_status as enum ('applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn');
create type public.interview_slot_status as enum ('proposed', 'selected', 'cancelled');

-- A community member who works at the company shares a referral link for a job (the row id is the link code).
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, referrer_id)
);

create index referrals_referrer_id_idx on public.referrals (referrer_id);

create trigger referrals_set_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  -- A CV used in an application cannot be deleted (the employer still needs it).
  cv_id uuid not null references public.cvs (id) on delete restrict,
  cover_note text check (char_length(cover_note) <= 2000),
  status public.application_status not null default 'applied',
  referral_id uuid references public.referrals (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create index job_applications_applicant_id_idx on public.job_applications (applicant_id, created_at desc);
create index job_applications_job_status_idx on public.job_applications (job_id, status);
create index job_applications_cv_id_idx on public.job_applications (cv_id);
create index job_applications_referral_id_idx on public.job_applications (referral_id);

create trigger job_applications_set_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

create table public.application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications (id) on delete cascade,
  question_id uuid not null references public.job_screening_questions (id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, question_id)
);

create index application_answers_question_id_idx on public.application_answers (question_id);

create trigger application_answers_set_updated_at
  before update on public.application_answers
  for each row execute function public.set_updated_at();

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index application_status_history_application_id_idx on public.application_status_history (application_id, created_at);
create index application_status_history_changed_by_idx on public.application_status_history (changed_by);

create trigger application_status_history_set_updated_at
  before update on public.application_status_history
  for each row execute function public.set_updated_at();

-- Employer-private notes. Never visible to the applicant.
create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index application_notes_application_id_idx on public.application_notes (application_id, created_at);
create index application_notes_author_id_idx on public.application_notes (author_id);

create trigger application_notes_set_updated_at
  before update on public.application_notes
  for each row execute function public.set_updated_at();

create table public.interview_slots (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications (id) on delete cascade,
  proposed_by uuid references public.profiles (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location_or_link text check (char_length(location_or_link) <= 300),
  status public.interview_slot_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '8 hours')
);

create index interview_slots_application_id_idx on public.interview_slots (application_id, starts_at);
create index interview_slots_proposed_by_idx on public.interview_slots (proposed_by);

create trigger interview_slots_set_updated_at
  before update on public.interview_slots
  for each row execute function public.set_updated_at();

-- Helpers (definer, so policies do not recurse through each other's RLS) ----------

create or replace function private.has_applied_to_job(p_job_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.job_applications a
    where a.job_id = p_job_id and a.applicant_id = (select auth.uid())
  );
$$;

create or replace function private.is_my_application(p_application_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.job_applications a
    where a.id = p_application_id and a.applicant_id = (select auth.uid())
  );
$$;

create or replace function private.is_application_company_member(p_application_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.job_applications a
    join public.jobs j on j.id = a.job_id
    join public.company_members m on m.company_id = j.company_id
    where a.id = p_application_id and m.user_id = (select auth.uid())
  );
$$;

-- True when p_user_id has a live (not withdrawn) application to a job of a company the caller belongs to.
create or replace function private.is_applicant_to_my_company(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.job_applications a
    join public.jobs j on j.id = a.job_id
    join public.company_members m on m.company_id = j.company_id
    where a.applicant_id = p_user_id and a.status <> 'withdrawn' and m.user_id = (select auth.uid())
  );
$$;

-- True when the CV was used in a live application to a job of a company the caller belongs to.
create or replace function private.can_view_cv(p_cv_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.job_applications a
    join public.jobs j on j.id = a.job_id
    join public.company_members m on m.company_id = j.company_id
    where a.cv_id = p_cv_id and a.status <> 'withdrawn' and m.user_id = (select auth.uid())
  );
$$;

revoke execute on function private.has_applied_to_job(uuid), private.is_my_application(uuid),
  private.is_application_company_member(uuid), private.is_applicant_to_my_company(uuid),
  private.can_view_cv(uuid) from public, anon;
grant execute on function private.has_applied_to_job(uuid), private.is_my_application(uuid),
  private.is_application_company_member(uuid), private.is_applicant_to_my_company(uuid),
  private.can_view_cv(uuid) to authenticated;

-- Referral rules: the job is live and the referrer says they work at that company.
create or replace function public.referrals_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_job_public(new.job_id) then
    raise exception 'job_not_open' using errcode = 'P0001';
  end if;
  if not exists (
    select 1
    from public.jobs j
    join public.company_affiliations a on a.company_id = j.company_id
    where j.id = new.job_id and a.user_id = new.referrer_id
  ) then
    raise exception 'affiliation_required' using errcode = 'P0001';
  end if;
  perform public.check_rate_limit('referral', 20, interval '1 day');
  return new;
end;
$$;

revoke execute on function public.referrals_before_insert() from public, anon, authenticated;

create trigger referrals_before_insert
  before insert on public.referrals
  for each row execute function public.referrals_before_insert();

-- Interview slot rules for employers.
create or replace function public.interview_slots_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if new.starts_at <= now() then
      raise exception 'slot_in_past' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.job_applications a
      where a.id = new.application_id and a.status not in ('withdrawn', 'rejected', 'hired')
    ) then
      raise exception 'application_closed' using errcode = 'P0001';
    end if;
    if (select count(*) from public.interview_slots s
        where s.application_id = new.application_id and s.status = 'proposed') >= 10 then
      raise exception 'slot_limit_reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.interview_slots_before_insert() from public, anon, authenticated;

create trigger interview_slots_before_insert
  before insert on public.interview_slots
  for each row execute function public.interview_slots_before_insert();

-- RPCs --------------------------------------------------------------------------

-- apply_to_job: validates everything in one transaction. p_answers is {"<question_id>": "<answer>"}.
create or replace function private.apply_to_job(
  p_job_id uuid,
  p_cv_id uuid,
  p_cover_note text,
  p_answers jsonb,
  p_referral_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_job public.jobs;
  v_answers jsonb := coalesce(p_answers, '{}'::jsonb);
  v_note text := nullif(btrim(coalesce(p_cover_note, '')), '');
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

  select * into v_job from public.jobs j where j.id = p_job_id;
  if not found or not private.is_job_public(p_job_id) then
    raise exception 'job_not_open' using errcode = 'P0001';
  end if;
  if v_job.application_deadline is not null and v_job.application_deadline < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'deadline_passed' using errcode = 'P0001';
  end if;
  if private.is_company_member(v_job.company_id) then
    raise exception 'cannot_apply_to_own_company' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.job_applications a where a.job_id = p_job_id and a.applicant_id = v_uid) then
    raise exception 'already_applied' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.cvs c where c.id = p_cv_id and c.user_id = v_uid) then
    raise exception 'invalid_cv' using errcode = '22023';
  end if;
  if char_length(v_note) > 2000 then
    raise exception 'cover_note_too_long' using errcode = '22023';
  end if;
  if jsonb_typeof(v_answers) <> 'object' then
    raise exception 'invalid_answers' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.job_screening_questions q
    where q.job_id = p_job_id and q.is_required
      and nullif(btrim(coalesce(v_answers ->> q.id::text, '')), '') is null
  ) then
    raise exception 'required_answer_missing' using errcode = '22023';
  end if;
  if p_referral_id is not null and not exists (
    select 1 from public.referrals r
    where r.id = p_referral_id and r.job_id = p_job_id and r.referrer_id <> v_uid
  ) then
    raise exception 'invalid_referral' using errcode = '22023';
  end if;

  perform public.check_rate_limit('job_application', 30, interval '1 day');

  insert into public.job_applications (job_id, applicant_id, cv_id, cover_note, referral_id)
  values (p_job_id, v_uid, p_cv_id, v_note, p_referral_id)
  returning id into v_id;

  insert into public.application_answers (application_id, question_id, answer)
  select v_id, q.id, left(btrim(v_answers ->> q.id::text), 1000)
  from public.job_screening_questions q
  where q.job_id = p_job_id
    and nullif(btrim(coalesce(v_answers ->> q.id::text, '')), '') is not null;

  insert into public.application_status_history (application_id, from_status, to_status, changed_by)
  values (v_id, null, 'applied', v_uid);

  return v_id;
end;
$$;

create or replace function public.apply_to_job(
  p_job_id uuid,
  p_cv_id uuid,
  p_cover_note text default null,
  p_answers jsonb default '{}'::jsonb,
  p_referral_id uuid default null
)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.apply_to_job(p_job_id, p_cv_id, p_cover_note, p_answers, p_referral_id);
$$;

create or replace function private.withdraw_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status public.application_status;
begin
  select a.status into v_status
  from public.job_applications a
  where a.id = p_application_id and a.applicant_id = v_uid
  for update;
  if not found then
    raise exception 'application_not_found' using errcode = 'P0002';
  end if;
  if v_status in ('withdrawn', 'hired', 'rejected') then
    raise exception 'application_closed' using errcode = 'P0001';
  end if;

  update public.job_applications set status = 'withdrawn' where id = p_application_id;
  update public.interview_slots set status = 'cancelled'
  where application_id = p_application_id and status <> 'cancelled';
  insert into public.application_status_history (application_id, from_status, to_status, changed_by)
  values (p_application_id, v_status, 'withdrawn', v_uid);
end;
$$;

create or replace function public.withdraw_application(p_application_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.withdraw_application(p_application_id);
$$;

-- set_application_status: a company member moves an applicant through the pipeline.
-- An optional note is saved as an employer-private note.
create or replace function private.set_application_status(
  p_application_id uuid,
  p_status public.application_status,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status public.application_status;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not private.is_application_company_member(p_application_id) then
    raise exception 'not_company_member' using errcode = '42501';
  end if;
  if p_status is null or p_status in ('applied', 'withdrawn') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  select a.status into v_status from public.job_applications a where a.id = p_application_id for update;
  if v_status = 'withdrawn' then
    raise exception 'application_withdrawn' using errcode = 'P0001';
  end if;
  if v_status = p_status then
    return;
  end if;

  update public.job_applications set status = p_status where id = p_application_id;
  insert into public.application_status_history (application_id, from_status, to_status, changed_by)
  values (p_application_id, v_status, p_status, v_uid);

  if p_status in ('rejected', 'hired') then
    update public.interview_slots set status = 'cancelled'
    where application_id = p_application_id and status = 'proposed';
  end if;

  if v_note is not null then
    insert into public.application_notes (application_id, author_id, body)
    values (p_application_id, v_uid, left(v_note, 2000));
  end if;
end;
$$;

create or replace function public.set_application_status(
  p_application_id uuid,
  p_status public.application_status,
  p_note text default null
)
returns void
language sql security invoker set search_path = ''
as $$
  select private.set_application_status(p_application_id, p_status, p_note);
$$;

-- pick_interview_slot: the applicant chooses one proposed slot; the other proposals are cancelled.
create or replace function private.pick_interview_slot(p_slot_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot public.interview_slots;
begin
  select * into v_slot from public.interview_slots s where s.id = p_slot_id for update;
  if not found or not private.is_my_application(v_slot.application_id) then
    raise exception 'slot_not_found' using errcode = 'P0002';
  end if;
  if v_slot.status <> 'proposed' or v_slot.starts_at <= now() then
    raise exception 'slot_not_available' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.job_applications a
    where a.id = v_slot.application_id and a.status in ('withdrawn', 'rejected', 'hired')
  ) then
    raise exception 'application_closed' using errcode = 'P0001';
  end if;

  update public.interview_slots set status = 'selected' where id = p_slot_id;
  update public.interview_slots set status = 'cancelled'
  where application_id = v_slot.application_id and id <> p_slot_id and status = 'proposed';
end;
$$;

create or replace function public.pick_interview_slot(p_slot_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.pick_interview_slot(p_slot_id);
$$;

-- cancel_interview_slot: a company member cancels a proposed or selected slot.
create or replace function private.cancel_interview_slot(p_slot_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.interview_slots s
    where s.id = p_slot_id and private.is_application_company_member(s.application_id)
  ) then
    raise exception 'not_company_member' using errcode = '42501';
  end if;
  update public.interview_slots set status = 'cancelled' where id = p_slot_id;
end;
$$;

create or replace function public.cancel_interview_slot(p_slot_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.cancel_interview_slot(p_slot_id);
$$;

revoke execute on function
  private.apply_to_job(uuid, uuid, text, jsonb, uuid), private.withdraw_application(uuid),
  private.set_application_status(uuid, public.application_status, text),
  private.pick_interview_slot(uuid), private.cancel_interview_slot(uuid) from public, anon;
revoke execute on function
  public.apply_to_job(uuid, uuid, text, jsonb, uuid), public.withdraw_application(uuid),
  public.set_application_status(uuid, public.application_status, text),
  public.pick_interview_slot(uuid), public.cancel_interview_slot(uuid) from public, anon;
grant execute on function
  private.apply_to_job(uuid, uuid, text, jsonb, uuid), private.withdraw_application(uuid),
  private.set_application_status(uuid, public.application_status, text),
  private.pick_interview_slot(uuid), private.cancel_interview_slot(uuid) to authenticated;
grant execute on function
  public.apply_to_job(uuid, uuid, text, jsonb, uuid), public.withdraw_application(uuid),
  public.set_application_status(uuid, public.application_status, text),
  public.pick_interview_slot(uuid), public.cancel_interview_slot(uuid) to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.referrals enable row level security;
alter table public.job_applications enable row level security;
alter table public.application_answers enable row level security;
alter table public.application_status_history enable row level security;
alter table public.application_notes enable row level security;
alter table public.interview_slots enable row level security;

revoke all on public.referrals, public.job_applications, public.application_answers,
  public.application_status_history, public.application_notes, public.interview_slots from anon, authenticated;

-- job_applications: read-only for API roles. Seekers see their own; employers see applications to their jobs.
grant select on public.job_applications to authenticated;

create policy job_applications_select on public.job_applications
  for select to authenticated
  using (
    applicant_id = (select auth.uid())
    or (select private.is_job_company_member(job_id))
    or (select public.is_admin())
  );

-- application_answers and history: same audience, written by RPCs only.
grant select on public.application_answers, public.application_status_history to authenticated;

create policy application_answers_select on public.application_answers
  for select to authenticated
  using (
    (select private.is_my_application(application_id))
    or (select private.is_application_company_member(application_id))
    or (select public.is_admin())
  );

create policy application_status_history_select on public.application_status_history
  for select to authenticated
  using (
    (select private.is_my_application(application_id))
    or (select private.is_application_company_member(application_id))
    or (select public.is_admin())
  );

-- application_notes: company members only.
grant select, delete on public.application_notes to authenticated;
grant insert (application_id, author_id, body), update (body) on public.application_notes to authenticated;

create policy application_notes_select on public.application_notes
  for select to authenticated
  using ((select private.is_application_company_member(application_id)) or (select public.is_admin()));
create policy application_notes_insert on public.application_notes
  for insert to authenticated
  with check ((select private.is_application_company_member(application_id)) and author_id = (select auth.uid()));
create policy application_notes_update on public.application_notes
  for update to authenticated
  using (author_id = (select auth.uid()) and (select private.is_application_company_member(application_id)))
  with check (author_id = (select auth.uid()) and (select private.is_application_company_member(application_id)));
create policy application_notes_delete on public.application_notes
  for delete to authenticated
  using (author_id = (select auth.uid()) and (select private.is_application_company_member(application_id)));

-- interview_slots: company members propose; the applicant sees them and picks via RPC.
grant select on public.interview_slots to authenticated;
grant insert (application_id, proposed_by, starts_at, ends_at, location_or_link) on public.interview_slots to authenticated;

create policy interview_slots_select on public.interview_slots
  for select to authenticated
  using (
    (select private.is_my_application(application_id))
    or (select private.is_application_company_member(application_id))
    or (select public.is_admin())
  );
create policy interview_slots_insert on public.interview_slots
  for insert to authenticated
  with check (
    (select private.is_application_company_member(application_id))
    and proposed_by = (select auth.uid())
    and status = 'proposed'
  );

-- referrals: the referrer manages their own links; the employer sees referrals for their jobs.
grant select, delete on public.referrals to authenticated;
grant insert (job_id, referrer_id, note) on public.referrals to authenticated;

create policy referrals_select on public.referrals
  for select to authenticated
  using (
    referrer_id = (select auth.uid())
    or (select private.is_job_company_member(job_id))
    or (select public.is_admin())
  );
create policy referrals_insert on public.referrals
  for insert to authenticated with check (referrer_id = (select auth.uid()));
create policy referrals_delete on public.referrals
  for delete to authenticated using (referrer_id = (select auth.uid()));

-- jobs: signed-in users see public jobs, their company's jobs, and jobs they applied to (even after closing).
create policy jobs_select on public.jobs
  for select to authenticated
  using (
    (status = 'published' and hidden_at is null and private.is_company_public(company_id))
    or (select private.is_company_member(company_id))
    or (select public.is_admin())
    or private.has_applied_to_job(id)
  );

-- Seeker data: the owner, admins, and employers the seeker has a live application with.
create policy seeker_profiles_select on public.seeker_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or private.is_applicant_to_my_company(user_id));

create policy profile_skills_select on public.profile_skills
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or private.is_applicant_to_my_company(user_id));

create policy experiences_select on public.experiences
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or private.is_applicant_to_my_company(user_id));

create policy educations_select on public.educations
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or private.is_applicant_to_my_company(user_id));

-- Salary expectations reach employers only when the seeker opted in.
create policy seeker_salary_prefs_select on public.seeker_salary_prefs
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or (share_with_employers and private.is_applicant_to_my_company(user_id))
  );

create policy cvs_select on public.cvs
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or private.can_view_cv(id));
