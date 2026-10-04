-- Phase 2 / M008 jobs, salaries, skills, screening questions, status rules.

create type public.job_type as enum ('full_time', 'part_time', 'contract', 'internship');
create type public.job_status as enum ('draft', 'pending_review', 'published', 'closed', 'expired');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  posted_by uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  description text not null check (char_length(description) between 1 and 8000),
  requirements text check (char_length(requirements) <= 4000),
  job_type public.job_type not null,
  work_mode public.work_mode not null,
  experience_level public.experience_level not null,
  city_id uuid references public.cities (id) on delete restrict,
  neighbourhood_id uuid references public.neighbourhoods (id) on delete set null,
  address_text text check (char_length(address_text) <= 300),
  -- Set from the neighbourhood or city centre when not given (map pin picker arrives with the maps module).
  location extensions.geography(point, 4326),
  openings integer not null default 1 check (openings between 1 and 1000),
  application_deadline date,
  status public.job_status not null default 'draft',
  published_at timestamptz,
  closed_at timestamptz,
  expires_at timestamptz,
  hidden_at timestamptz,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(description, '')), 'B')
    || setweight(to_tsvector('english', coalesce(requirements, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Remote jobs may omit the city; everything else needs one.
  check (work_mode = 'remote' or city_id is not null)
);

create index jobs_search_tsv_idx on public.jobs using gin (search_tsv);
create index jobs_location_gix on public.jobs using gist (location);
create index jobs_status_published_at_idx on public.jobs (status, published_at desc);
create index jobs_city_id_idx on public.jobs (city_id);
create index jobs_neighbourhood_id_idx on public.jobs (neighbourhood_id);
create index jobs_company_id_idx on public.jobs (company_id);
create index jobs_posted_by_idx on public.jobs (posted_by);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Annual salary range in paise. Separate table so a hidden salary is hidden by RLS, not just by the UI.
create table public.job_salaries (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  salary_min bigint check (salary_min >= 0),
  salary_max bigint check (salary_max >= 0),
  currency char(3) not null default 'INR',
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_min is null or salary_max is null or salary_min <= salary_max)
);

create trigger job_salaries_set_updated_at
  before update on public.job_salaries
  for each row execute function public.set_updated_at();

create table public.job_skills (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, skill_id)
);

create index job_skills_skill_id_idx on public.job_skills (skill_id);

create trigger job_skills_set_updated_at
  before update on public.job_skills
  for each row execute function public.set_updated_at();

create table public.job_screening_questions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  question text not null check (char_length(question) between 3 and 300),
  is_required boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_screening_questions_job_id_idx on public.job_screening_questions (job_id, position);

create trigger job_screening_questions_set_updated_at
  before update on public.job_screening_questions
  for each row execute function public.set_updated_at();

-- Helpers ---------------------------------------------------------------------

create or replace function private.is_job_company_member(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jobs j
    join public.company_members m on m.company_id = j.company_id
    where j.id = p_job_id and m.user_id = (select auth.uid())
  );
$$;

-- A job the public may see: published, not hidden, and its company is verified and not hidden.
create or replace function private.is_job_public(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jobs j
    join public.companies c on c.id = j.company_id
    where j.id = p_job_id
      and j.status = 'published' and j.hidden_at is null
      and c.verification_status = 'approved' and c.hidden_at is null
  );
$$;

revoke execute on function private.is_job_company_member(uuid), private.is_job_public(uuid) from public, anon;
grant execute on function private.is_job_company_member(uuid) to authenticated;
grant execute on function private.is_job_public(uuid) to anon, authenticated;

-- Status rules (BUILD_PLAN M008):
--   * new jobs start as draft
--   * publishing needs a verified company; a company's first job goes to pending_review
--   * only admins move pending_review -> published
--   * server-side contexts without a JWT (cron, seed) are not restricted
create or replace function public.jobs_enforce_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_admin boolean := v_uid is not null and private.is_admin();
  v_company public.companies;
begin
  -- Default the map point from the neighbourhood or city centre.
  if new.location is null then
    new.location := coalesce(
      (select n.center from public.neighbourhoods n where n.id = new.neighbourhood_id),
      (select c.center from public.cities c where c.id = new.city_id)
    );
  end if;

  if tg_op = 'INSERT' then
    if v_uid is not null and not v_admin then
      if new.status <> 'draft' then
        raise exception 'job_must_start_as_draft' using errcode = 'P0001';
      end if;
      new.published_at := null;
      new.closed_at := null;
      new.expires_at := null;
      new.hidden_at := null;
    elsif new.status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;
    if new.status = 'published' then
      new.expires_at := coalesce((new.application_deadline + 1)::timestamptz, new.published_at + interval '60 days');
    end if;
    return new;
  end if;

  if new.company_id <> old.company_id then
    raise exception 'job_company_is_fixed' using errcode = 'P0001';
  end if;

  if new.status is distinct from old.status and v_uid is not null then
    select * into v_company from public.companies c where c.id = new.company_id;

    if new.status = 'published' then
      if v_company.verification_status <> 'approved' or v_company.hidden_at is not null then
        raise exception 'company_not_verified' using errcode = 'P0001';
      end if;
      if old.status = 'pending_review' then
        if not v_admin then
          raise exception 'job_awaiting_review' using errcode = 'P0001';
        end if;
      elsif old.status not in ('draft', 'closed') then
        raise exception 'invalid_job_status_change' using errcode = 'P0001';
      elsif not v_admin and not exists (
        select 1 from public.jobs j where j.company_id = new.company_id and j.published_at is not null
      ) then
        -- First job of this company: an admin reviews it before it goes live.
        new.status := 'pending_review';
      end if;
    elsif new.status = 'pending_review' then
      if old.status <> 'draft' then
        raise exception 'invalid_job_status_change' using errcode = 'P0001';
      end if;
      if v_company.verification_status <> 'approved' then
        raise exception 'company_not_verified' using errcode = 'P0001';
      end if;
    elsif new.status = 'draft' then
      if old.status <> 'pending_review' then
        raise exception 'invalid_job_status_change' using errcode = 'P0001';
      end if;
    elsif new.status = 'closed' then
      if old.status not in ('published', 'pending_review') then
        raise exception 'invalid_job_status_change' using errcode = 'P0001';
      end if;
    elsif new.status = 'expired' then
      if not v_admin then
        raise exception 'invalid_job_status_change' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'published' then
      new.published_at := now();
      new.closed_at := null;
    elsif new.status in ('closed', 'expired') then
      new.closed_at := now();
    end if;
  end if;

  -- Listings run until the day after the deadline, or 60 days when there is none.
  if new.status = 'published' then
    new.expires_at := coalesce((new.application_deadline + 1)::timestamptz, new.published_at + interval '60 days');
  end if;

  return new;
end;
$$;

revoke execute on function public.jobs_enforce_status() from public, anon, authenticated;

create trigger jobs_enforce_status
  before insert or update on public.jobs
  for each row execute function public.jobs_enforce_status();

create trigger jobs_audit after update or delete on public.jobs
  for each row execute function public.audit_admin_change();

-- admin_review_job: approve (publish) or send back a job that is pending review. Audited.
create or replace function private.admin_review_job(p_job_id uuid, p_approve boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if not exists (select 1 from public.jobs j where j.id = p_job_id and j.status = 'pending_review') then
    raise exception 'job_not_pending_review' using errcode = 'P0001';
  end if;

  update public.jobs
  set status = case when p_approve then 'published' else 'draft' end::public.job_status
  where id = p_job_id;

  perform public.log_admin_action(
    case when p_approve then 'job_approved' else 'job_sent_back' end,
    'jobs', p_job_id, jsonb_build_object('reason', nullif(btrim(coalesce(p_reason, '')), ''))
  );
end;
$$;

create or replace function public.admin_review_job(p_job_id uuid, p_approve boolean, p_reason text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_review_job(p_job_id, p_approve, p_reason);
$$;

revoke execute on function private.admin_review_job(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_review_job(uuid, boolean, text) from public, anon;
grant execute on function private.admin_review_job(uuid, boolean, text) to authenticated;
grant execute on function public.admin_review_job(uuid, boolean, text) to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.jobs enable row level security;
alter table public.job_salaries enable row level security;
alter table public.job_skills enable row level security;
alter table public.job_screening_questions enable row level security;

revoke all on public.jobs, public.job_salaries, public.job_skills, public.job_screening_questions
  from anon, authenticated;

-- jobs. The authenticated select policy is created in the applications migration (applicants keep access).
grant select on public.jobs to anon, authenticated;
grant insert (company_id, posted_by, title, description, requirements, job_type, work_mode, experience_level,
  city_id, neighbourhood_id, address_text, location, openings, application_deadline, status)
  on public.jobs to authenticated;
grant update (title, description, requirements, job_type, work_mode, experience_level,
  city_id, neighbourhood_id, address_text, location, openings, application_deadline, status)
  on public.jobs to authenticated;
grant delete on public.jobs to authenticated;

create policy jobs_select_public on public.jobs
  for select to anon
  using (status = 'published' and hidden_at is null and private.is_company_public(company_id));

create policy jobs_insert on public.jobs
  for insert to authenticated
  with check ((select private.is_company_member(company_id)) and posted_by = (select auth.uid()));

create policy jobs_update on public.jobs
  for update to authenticated
  using ((select private.is_company_member(company_id)))
  with check ((select private.is_company_member(company_id)));

-- Only drafts can be deleted; anything that was live is closed instead.
create policy jobs_delete on public.jobs
  for delete to authenticated
  using ((select private.is_company_member(company_id)) and status = 'draft');

-- job_salaries: visible salary of a public job, or company members, or admins.
grant select on public.job_salaries to anon, authenticated;
grant insert (job_id, salary_min, salary_max, is_visible), update (salary_min, salary_max, is_visible), delete
  on public.job_salaries to authenticated;

create policy job_salaries_select_public on public.job_salaries
  for select to anon
  using (is_visible and private.is_job_public(job_id));

create policy job_salaries_select on public.job_salaries
  for select to authenticated
  using (
    (is_visible and private.is_job_public(job_id))
    or (select private.is_job_company_member(job_id))
    or (select public.is_admin())
  );

create policy job_salaries_insert on public.job_salaries
  for insert to authenticated with check ((select private.is_job_company_member(job_id)));
create policy job_salaries_update on public.job_salaries
  for update to authenticated
  using ((select private.is_job_company_member(job_id)))
  with check ((select private.is_job_company_member(job_id)));
create policy job_salaries_delete on public.job_salaries
  for delete to authenticated using ((select private.is_job_company_member(job_id)));

-- job_skills and job_screening_questions: readable with the job; company members manage.
grant select on public.job_skills, public.job_screening_questions to anon, authenticated;
grant insert (job_id, skill_id), delete on public.job_skills to authenticated;
grant insert (job_id, question, is_required, position), update (question, is_required, position), delete
  on public.job_screening_questions to authenticated;

create policy job_skills_select_public on public.job_skills
  for select to anon using (private.is_job_public(job_id));
create policy job_skills_select on public.job_skills
  for select to authenticated
  using (
    private.is_job_public(job_id)
    or (select private.is_job_company_member(job_id))
    or (select public.is_admin())
  );
create policy job_skills_insert on public.job_skills
  for insert to authenticated with check ((select private.is_job_company_member(job_id)));
create policy job_skills_delete on public.job_skills
  for delete to authenticated using ((select private.is_job_company_member(job_id)));

create policy job_screening_questions_select_public on public.job_screening_questions
  for select to anon using (private.is_job_public(job_id));
create policy job_screening_questions_select on public.job_screening_questions
  for select to authenticated
  using (
    private.is_job_public(job_id)
    or (select private.is_job_company_member(job_id))
    or (select public.is_admin())
  );
create policy job_screening_questions_insert on public.job_screening_questions
  for insert to authenticated with check ((select private.is_job_company_member(job_id)));
create policy job_screening_questions_update on public.job_screening_questions
  for update to authenticated
  using ((select private.is_job_company_member(job_id)))
  with check ((select private.is_job_company_member(job_id)));
create policy job_screening_questions_delete on public.job_screening_questions
  for delete to authenticated using ((select private.is_job_company_member(job_id)));
