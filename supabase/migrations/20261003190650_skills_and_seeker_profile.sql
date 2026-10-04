-- Phase 2 / M006 skills and seeker profile
-- Employer read access to seeker data is added in the applications migration (it needs job_applications).

create type public.experience_level as enum ('entry', 'mid', 'senior', 'lead');
create type public.work_mode as enum ('onsite', 'hybrid', 'remote');

-- Skills (shared tag list) ----------------------------------------------------

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index skills_name_trgm_idx on public.skills using gin (name extensions.gin_trgm_ops);
create index skills_created_by_idx on public.skills (created_by);

create trigger skills_set_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

insert into public.skills (name, slug)
select s.name, btrim(regexp_replace(lower(s.name), '[^a-z0-9]+', '-', 'g'), '-')
from unnest(array[
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'Django', 'Java', 'Spring Boot', 'Go',
  'C#', '.NET', 'PHP', 'Laravel', 'SQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Azure', 'Docker', 'Kubernetes',
  'Git', 'HTML', 'CSS', 'Flutter', 'React Native', 'Android', 'iOS', 'Data Analysis', 'Excel', 'Power BI',
  'Machine Learning', 'QA Testing', 'UI Design', 'UX Research', 'Figma', 'Graphic Design', 'Video Editing',
  'Content Writing', 'Copywriting', 'SEO', 'Digital Marketing', 'Social Media', 'Sales', 'Business Development',
  'Customer Support', 'Accounting', 'Tally', 'GST', 'Financial Analysis', 'HR', 'Recruitment', 'Operations',
  'Project Management', 'Product Management', 'Supply Chain', 'Teaching', 'Nursing', 'Pharmacy',
  'Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'AutoCAD', 'Legal', 'Communication',
  'Urdu', 'Hindi', 'English', 'Arabic'
]) as s (name);

-- Seeker profile ----------------------------------------------------------------

create table public.seeker_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text check (char_length(headline) <= 120),
  summary text check (char_length(summary) <= 2000),
  experience_level public.experience_level,
  work_mode_pref public.work_mode,
  preferred_city_ids uuid[] not null default '{}' check (cardinality(preferred_city_ids) <= 10),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  linkedin_url text check (linkedin_url ~ '^https://' and char_length(linkedin_url) <= 300),
  portfolio_url text check (portfolio_url ~ '^https://' and char_length(portfolio_url) <= 300),
  open_to_relocate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger seeker_profiles_set_updated_at
  before update on public.seeker_profiles
  for each row execute function public.set_updated_at();

-- Expected annual salary, in paise. Separate table so it stays private unless shared.
create table public.seeker_salary_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  salary_min bigint check (salary_min >= 0),
  salary_max bigint check (salary_max >= 0),
  currency char(3) not null default 'INR',
  share_with_employers boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_min is null or salary_max is null or salary_min <= salary_max)
);

create trigger seeker_salary_prefs_set_updated_at
  before update on public.seeker_salary_prefs
  for each row execute function public.set_updated_at();

create table public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

create index profile_skills_skill_id_idx on public.profile_skills (skill_id);

create trigger profile_skills_set_updated_at
  before update on public.profile_skills
  for each row execute function public.set_updated_at();

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  company_name text not null check (char_length(company_name) between 1 and 120),
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  description text check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (not (is_current and end_date is not null))
);

create index experiences_user_id_idx on public.experiences (user_id, start_date desc);

create trigger experiences_set_updated_at
  before update on public.experiences
  for each row execute function public.set_updated_at();

create table public.educations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  institution text not null check (char_length(institution) between 1 and 160),
  degree text not null check (char_length(degree) between 1 and 120),
  field text check (char_length(field) <= 120),
  start_year integer check (start_year between 1950 and 2100),
  end_year integer check (end_year between 1950 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_year is null or end_year is null or end_year >= start_year)
);

create index educations_user_id_idx on public.educations (user_id);

create trigger educations_set_updated_at
  before update on public.educations
  for each row execute function public.set_updated_at();

-- CV metadata. The file lives in the private "cvs" bucket at storage_path = '{user_id}/{uuid}.pdf'.
create table public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 200),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path like user_id::text || '/%' and storage_path ~ '\.pdf$')
);

create index cvs_user_id_idx on public.cvs (user_id);
create unique index cvs_one_default_idx on public.cvs (user_id) where is_default;

create trigger cvs_set_updated_at
  before update on public.cvs
  for each row execute function public.set_updated_at();

-- At most 5 CVs per user.
create or replace function public.cvs_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.cvs c where c.user_id = new.user_id) >= 5 then
    raise exception 'cv_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.cvs_before_insert() from public, anon, authenticated;

create trigger cvs_before_insert
  before insert on public.cvs
  for each row execute function public.cvs_before_insert();

-- add_skill: any signed-in user can add a missing skill tag (rate-limited). Returns the skill id.
create or replace function private.add_skill(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_slug text := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(v_name) not between 1 and 60 or v_slug = '' then
    raise exception 'invalid_skill_name' using errcode = '22023';
  end if;

  select s.id into v_id from public.skills s where s.slug = v_slug;
  if v_id is not null then
    return v_id;
  end if;

  perform public.check_rate_limit('add_skill', 20, interval '1 day');

  insert into public.skills (name, slug, created_by)
  values (v_name, v_slug, (select auth.uid()))
  on conflict (slug) do update set slug = excluded.slug
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.add_skill(p_name text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.add_skill(p_name);
$$;

revoke execute on function private.add_skill(text) from public, anon;
revoke execute on function public.add_skill(text) from public, anon;
grant execute on function private.add_skill(text) to authenticated;
grant execute on function public.add_skill(text) to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.skills enable row level security;
alter table public.seeker_profiles enable row level security;
alter table public.seeker_salary_prefs enable row level security;
alter table public.profile_skills enable row level security;
alter table public.experiences enable row level security;
alter table public.educations enable row level security;
alter table public.cvs enable row level security;

revoke all on public.skills, public.seeker_profiles, public.seeker_salary_prefs, public.profile_skills,
  public.experiences, public.educations, public.cvs from anon, authenticated;

-- skills: public read; new tags via add_skill(); admins edit.
grant select on public.skills to anon, authenticated;
grant update (name, slug), delete on public.skills to authenticated;

create policy skills_select on public.skills
  for select to anon, authenticated using (true);
create policy skills_admin_update on public.skills
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy skills_admin_delete on public.skills
  for delete to authenticated using ((select public.is_admin()));

create trigger skills_audit after update or delete on public.skills
  for each row execute function public.audit_admin_change();

-- seeker_profiles
grant select, delete on public.seeker_profiles to authenticated;
grant insert (user_id, headline, summary, experience_level, work_mode_pref, preferred_city_ids, languages,
  linkedin_url, portfolio_url, open_to_relocate) on public.seeker_profiles to authenticated;
grant update (headline, summary, experience_level, work_mode_pref, preferred_city_ids, languages,
  linkedin_url, portfolio_url, open_to_relocate) on public.seeker_profiles to authenticated;

create policy seeker_profiles_insert on public.seeker_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy seeker_profiles_update on public.seeker_profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy seeker_profiles_delete on public.seeker_profiles
  for delete to authenticated using (user_id = (select auth.uid()));

-- seeker_salary_prefs
grant select, delete on public.seeker_salary_prefs to authenticated;
grant insert (user_id, salary_min, salary_max, share_with_employers) on public.seeker_salary_prefs to authenticated;
grant update (salary_min, salary_max, share_with_employers) on public.seeker_salary_prefs to authenticated;

create policy seeker_salary_prefs_insert on public.seeker_salary_prefs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy seeker_salary_prefs_update on public.seeker_salary_prefs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy seeker_salary_prefs_delete on public.seeker_salary_prefs
  for delete to authenticated using (user_id = (select auth.uid()));

-- profile_skills
grant select, delete on public.profile_skills to authenticated;
grant insert (user_id, skill_id) on public.profile_skills to authenticated;

create policy profile_skills_insert on public.profile_skills
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy profile_skills_delete on public.profile_skills
  for delete to authenticated using (user_id = (select auth.uid()));

-- experiences
grant select, delete on public.experiences to authenticated;
grant insert (user_id, title, company_name, start_date, end_date, is_current, description) on public.experiences to authenticated;
grant update (title, company_name, start_date, end_date, is_current, description) on public.experiences to authenticated;

create policy experiences_insert on public.experiences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy experiences_update on public.experiences
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy experiences_delete on public.experiences
  for delete to authenticated using (user_id = (select auth.uid()));

-- educations
grant select, delete on public.educations to authenticated;
grant insert (user_id, institution, degree, field, start_year, end_year) on public.educations to authenticated;
grant update (institution, degree, field, start_year, end_year) on public.educations to authenticated;

create policy educations_insert on public.educations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy educations_update on public.educations
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy educations_delete on public.educations
  for delete to authenticated using (user_id = (select auth.uid()));

-- cvs
grant select, delete on public.cvs to authenticated;
grant insert (user_id, storage_path, file_name, size_bytes, is_default) on public.cvs to authenticated;
grant update (file_name, is_default) on public.cvs to authenticated;

create policy cvs_insert on public.cvs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy cvs_update on public.cvs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy cvs_delete on public.cvs
  for delete to authenticated using (user_id = (select auth.uid()));

-- Select policies for the six seeker tables are created in the applications migration,
-- where the employer-access helpers exist (one policy per table: owner, admin, or employer of an application).
