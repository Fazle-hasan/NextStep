-- Phase 2 / M010 saved jobs, saved searches, job search and recommendations.

create type public.alert_frequency as enum ('none', 'daily');

create table public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index saved_jobs_job_id_idx on public.saved_jobs (job_id);

create trigger saved_jobs_set_updated_at
  before update on public.saved_jobs
  for each row execute function public.set_updated_at();

-- A saved search is a named set of search_jobs filters. Daily alerts are sent by the digest function (Phase 6).
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object' and pg_column_size(filters) <= 4096),
  alert_frequency public.alert_frequency not null default 'none',
  last_alerted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_searches_user_id_idx on public.saved_searches (user_id);

create trigger saved_searches_set_updated_at
  before update on public.saved_searches
  for each row execute function public.set_updated_at();

create or replace function public.saved_searches_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.saved_searches s where s.user_id = new.user_id) >= 20 then
    raise exception 'saved_search_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.saved_searches_before_insert() from public, anon, authenticated;

create trigger saved_searches_before_insert
  before insert on public.saved_searches
  for each row execute function public.saved_searches_before_insert();

alter table public.saved_jobs enable row level security;
alter table public.saved_searches enable row level security;

revoke all on public.saved_jobs, public.saved_searches from anon, authenticated;

grant select, delete on public.saved_jobs to authenticated;
grant insert (user_id, job_id) on public.saved_jobs to authenticated;

create policy saved_jobs_select on public.saved_jobs
  for select to authenticated using (user_id = (select auth.uid()));
create policy saved_jobs_insert on public.saved_jobs
  for insert to authenticated with check (user_id = (select auth.uid()) and private.is_job_public(job_id));
create policy saved_jobs_delete on public.saved_jobs
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on public.saved_searches to authenticated;
grant insert (user_id, name, filters, alert_frequency), update (name, filters, alert_frequency)
  on public.saved_searches to authenticated;

create policy saved_searches_select on public.saved_searches
  for select to authenticated using (user_id = (select auth.uid()));
create policy saved_searches_insert on public.saved_searches
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy saved_searches_update on public.saved_searches
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saved_searches_delete on public.saved_searches
  for delete to authenticated using (user_id = (select auth.uid()));

-- search_jobs: public job search. SECURITY INVOKER, so RLS still applies (hidden salaries stay hidden
-- and cannot be probed with the salary filter). Salary values are annual, in paise.
create or replace function public.search_jobs(
  p_q text default null,
  p_city_id uuid default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km integer default null,
  p_job_types public.job_type[] default null,
  p_work_modes public.work_mode[] default null,
  p_levels public.experience_level[] default null,
  p_salary_min bigint default null,
  p_posted_within_days integer default null,
  p_leap_friendly boolean default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  job_type public.job_type,
  work_mode public.work_mode,
  experience_level public.experience_level,
  city_id uuid,
  city_name text,
  neighbourhood_name text,
  company_id uuid,
  company_name text,
  company_slug text,
  company_logo_path text,
  is_community_owned boolean,
  leap_friendly boolean,
  salary_min bigint,
  salary_max bigint,
  currency text,
  published_at timestamptz,
  application_deadline date,
  distance_km double precision,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      nullif(btrim(coalesce(p_q, '')), '') as txt,
      case when nullif(btrim(coalesce(p_q, '')), '') is not null
        then websearch_to_tsquery('english', p_q) end as tsq,
      case when p_lat is not null and p_lng is not null and p_radius_km is not null
        then extensions.st_point(p_lng, p_lat, 4326)::extensions.geography end as pt
  )
  select
    j.id, j.title, j.job_type, j.work_mode, j.experience_level,
    j.city_id, ci.name, n.name,
    c.id, c.name, c.slug, c.logo_path, c.is_community_owned, c.leap_friendly,
    s.salary_min, s.salary_max, s.currency::text,
    j.published_at, j.application_deadline,
    case when q.pt is not null and j.location is not null
      then round((extensions.st_distance(j.location, q.pt) / 1000.0)::numeric, 1)::double precision end,
    count(*) over ()
  from public.jobs j
  join public.companies c on c.id = j.company_id
  left join public.cities ci on ci.id = j.city_id
  left join public.neighbourhoods n on n.id = j.neighbourhood_id
  left join public.job_salaries s on s.job_id = j.id and s.is_visible
  cross join q
  where j.status = 'published'
    and j.hidden_at is null
    and c.verification_status = 'approved'
    and c.hidden_at is null
    and (j.expires_at is null or j.expires_at > now())
    and (
      q.txt is null
      or j.search_tsv @@ q.tsq
      or position(lower(q.txt) in lower(c.name)) > 0
      or exists (
        select 1 from public.job_skills js
        join public.skills sk on sk.id = js.skill_id
        where js.job_id = j.id and lower(sk.name) = lower(q.txt)
      )
    )
    and (p_city_id is null or j.city_id = p_city_id)
    and (p_job_types is null or cardinality(p_job_types) = 0 or j.job_type = any (p_job_types))
    and (p_work_modes is null or cardinality(p_work_modes) = 0 or j.work_mode = any (p_work_modes))
    and (p_levels is null or cardinality(p_levels) = 0 or j.experience_level = any (p_levels))
    and (p_salary_min is null or coalesce(s.salary_max, s.salary_min) >= p_salary_min)
    and (p_posted_within_days is null or j.published_at >= now() - make_interval(days => p_posted_within_days))
    and (p_leap_friendly is not true or c.leap_friendly)
    and (q.pt is null or (j.location is not null and extensions.st_dwithin(j.location, q.pt, p_radius_km * 1000.0)))
  order by
    case when q.tsq is not null then ts_rank(j.search_tsv, q.tsq) end desc nulls last,
    case when q.pt is not null then extensions.st_distance(j.location, q.pt) end asc nulls last,
    j.published_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_jobs(text, uuid, double precision, double precision, integer,
  public.job_type[], public.work_mode[], public.experience_level[], bigint, integer, boolean, integer, integer)
  to anon, authenticated;

-- recommended_jobs: open jobs scored on skill overlap (3 each), preferred/home city (2),
-- experience level (1) and work mode (1). Jobs the caller already applied to are left out.
create or replace function public.recommended_jobs(p_limit integer default 10)
returns table (
  id uuid,
  title text,
  job_type public.job_type,
  work_mode public.work_mode,
  experience_level public.experience_level,
  city_id uuid,
  city_name text,
  neighbourhood_name text,
  company_id uuid,
  company_name text,
  company_slug text,
  company_logo_path text,
  is_community_owned boolean,
  leap_friendly boolean,
  salary_min bigint,
  salary_max bigint,
  currency text,
  published_at timestamptz,
  application_deadline date,
  score integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select
      p.id as user_id,
      p.city_id as home_city_id,
      coalesce(sp.preferred_city_ids, '{}') as preferred_city_ids,
      sp.experience_level,
      sp.work_mode_pref
    from public.profiles p
    left join public.seeker_profiles sp on sp.user_id = p.id
    where p.id = (select auth.uid())
  ),
  scored as (
    select
      j.*,
      (
        3 * (
          select count(*) from public.job_skills js
          join public.profile_skills ps on ps.skill_id = js.skill_id
          where js.job_id = j.id and ps.user_id = me.user_id
        )
        + case when j.city_id = any (me.preferred_city_ids) or j.city_id = me.home_city_id then 2 else 0 end
        + case when j.experience_level = me.experience_level then 1 else 0 end
        + case when j.work_mode = me.work_mode_pref then 1 else 0 end
      )::integer as score
    from public.jobs j
    cross join me
    where j.status = 'published'
      and j.hidden_at is null
      and (j.expires_at is null or j.expires_at > now())
      and not exists (
        select 1 from public.job_applications a where a.job_id = j.id and a.applicant_id = me.user_id
      )
  )
  select
    j.id, j.title, j.job_type, j.work_mode, j.experience_level,
    j.city_id, ci.name, n.name,
    c.id, c.name, c.slug, c.logo_path, c.is_community_owned, c.leap_friendly,
    s.salary_min, s.salary_max, s.currency::text,
    j.published_at, j.application_deadline,
    j.score
  from scored j
  join public.companies c on c.id = j.company_id
  left join public.cities ci on ci.id = j.city_id
  left join public.neighbourhoods n on n.id = j.neighbourhood_id
  left join public.job_salaries s on s.job_id = j.id and s.is_visible
  where j.score > 0
    and c.verification_status = 'approved'
    and c.hidden_at is null
  order by j.score desc, j.published_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 30);
$$;

revoke execute on function public.recommended_jobs(integer) from public, anon;
grant execute on function public.recommended_jobs(integer) to authenticated;
