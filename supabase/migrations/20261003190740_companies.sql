-- Phase 2 / M007 companies, members, locations, affiliations, company verification.

create type public.company_size as enum ('s1_10', 's11_50', 's51_200', 's201_1000', 's1000_plus');
create type public.company_member_role as enum ('owner', 'recruiter');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_path text,
  industry text check (char_length(industry) <= 80),
  size public.company_size,
  website text check (website ~ '^https?://' and char_length(website) <= 300),
  description text check (char_length(description) <= 4000),
  is_community_owned boolean not null default false,
  leap_friendly boolean not null default false,
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_owner_id_idx on public.companies (owner_id);
create index companies_verification_status_idx on public.companies (verification_status);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.company_member_role not null default 'recruiter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index company_members_user_id_idx on public.company_members (user_id);

create trigger company_members_set_updated_at
  before update on public.company_members
  for each row execute function public.set_updated_at();

create table public.company_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete restrict,
  address text check (char_length(address) <= 300),
  location extensions.geography(point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index company_locations_company_id_idx on public.company_locations (company_id);
create index company_locations_city_id_idx on public.company_locations (city_id);
create index company_locations_location_gix on public.company_locations using gist (location);

create trigger company_locations_set_updated_at
  before update on public.company_locations
  for each row execute function public.set_updated_at();

-- "I work at Company X" (self-declared; the company owner can confirm). Backs community referrals.
create table public.company_affiliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  confirmed_by_company_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index company_affiliations_company_id_idx on public.company_affiliations (company_id);

create trigger company_affiliations_set_updated_at
  before update on public.company_affiliations
  for each row execute function public.set_updated_at();

-- Helpers ---------------------------------------------------------------------

create or replace function private.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = p_company_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_company_member(p_company_id);
$$;

-- A company the public may see: verified and not hidden. Definer so policies on other tables do not depend on companies RLS.
create or replace function private.is_company_public(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.companies c
    where c.id = p_company_id and c.verification_status = 'approved' and c.hidden_at is null
  );
$$;

-- create_company: creates the company, makes the caller its owner, grants the employer role
-- and opens a verification request (D-008: any company may register; publishing needs verification).
create or replace function private.create_company(
  p_name text,
  p_industry text,
  p_size public.company_size,
  p_website text,
  p_description text,
  p_is_community_owned boolean,
  p_leap_friendly boolean,
  p_verification_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_base text;
  v_slug text;
  v_n integer := 1;
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
  if char_length(v_name) not between 2 and 120 then
    raise exception 'invalid_company_name' using errcode = '22023';
  end if;
  if (select count(*) from public.companies c where c.owner_id = v_uid) >= 3 then
    raise exception 'company_limit_reached' using errcode = 'P0001';
  end if;

  v_base := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then
    v_base := 'company';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.companies c where c.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.companies (owner_id, name, slug, industry, size, website, description, is_community_owned, leap_friendly)
  values (
    v_uid, v_name, v_slug,
    nullif(btrim(coalesce(p_industry, '')), ''),
    p_size,
    nullif(btrim(coalesce(p_website, '')), ''),
    nullif(btrim(coalesce(p_description, '')), ''),
    coalesce(p_is_community_owned, false),
    coalesce(p_leap_friendly, false)
  )
  returning id into v_id;

  insert into public.company_members (company_id, user_id, member_role) values (v_id, v_uid, 'owner');

  insert into public.user_roles (user_id, role) values (v_uid, 'employer')
  on conflict (user_id, role) do nothing;

  insert into public.verification_requests (user_id, kind, subject_id, applicant_note)
  values (v_uid, 'company', v_id, nullif(btrim(coalesce(p_verification_note, '')), ''));

  return v_id;
end;
$$;

create or replace function public.create_company(
  p_name text,
  p_industry text default null,
  p_size public.company_size default null,
  p_website text default null,
  p_description text default null,
  p_is_community_owned boolean default false,
  p_leap_friendly boolean default false,
  p_verification_note text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_company(p_name, p_industry, p_size, p_website, p_description, p_is_community_owned, p_leap_friendly, p_verification_note);
$$;

-- request_company_verification: the owner asks again after a rejection.
create or replace function private.request_company_verification(p_company_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not exists (select 1 from public.companies c where c.id = p_company_id and c.owner_id = v_uid) then
    raise exception 'not_company_owner' using errcode = '42501';
  end if;
  if not exists (select 1 from public.companies c where c.id = p_company_id and c.verification_status = 'rejected') then
    raise exception 'verification_not_rejected' using errcode = 'P0001';
  end if;

  insert into public.verification_requests (user_id, kind, subject_id, applicant_note)
  values (v_uid, 'company', p_company_id, nullif(btrim(coalesce(p_note, '')), ''));

  update public.companies set verification_status = 'pending' where id = p_company_id;
end;
$$;

create or replace function public.request_company_verification(p_company_id uuid, p_note text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.request_company_verification(p_company_id, p_note);
$$;

-- confirm_affiliation: a company member confirms (or un-confirms) that someone works there.
create or replace function private.confirm_affiliation(p_affiliation_id uuid, p_confirm boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.company_affiliations a
    where a.id = p_affiliation_id and private.is_company_member(a.company_id)
  ) then
    raise exception 'not_company_member' using errcode = '42501';
  end if;

  update public.company_affiliations
  set confirmed_by_company_at = case when p_confirm then now() end
  where id = p_affiliation_id;
end;
$$;

create or replace function public.confirm_affiliation(p_affiliation_id uuid, p_confirm boolean default true)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.confirm_affiliation(p_affiliation_id, p_confirm);
$$;

-- admin_review_verification: approve or reject a verification request (D-015). Audited.
-- Company requests update the company. Mentor/buddy profiles are wired in when those tables exist (Phases 3-4).
create or replace function private.admin_review_verification(p_request_id uuid, p_approve boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.verification_requests;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
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
  set status = case when p_approve then 'approved' else 'rejected' end::public.verification_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      rejection_reason = case when p_approve then null else v_reason end
  where id = p_request_id;

  if v_req.kind = 'company' then
    update public.companies
    set verification_status = case when p_approve then 'approved' else 'rejected' end::public.verification_status,
        verified_at = case when p_approve then now() end
    where id = v_req.subject_id;
  end if;

  perform public.log_admin_action(
    case when p_approve then 'verification_approved' else 'verification_rejected' end,
    'verification_requests', p_request_id,
    jsonb_build_object('kind', v_req.kind, 'subject_id', v_req.subject_id, 'user_id', v_req.user_id, 'reason', v_reason)
  );
end;
$$;

create or replace function public.admin_review_verification(p_request_id uuid, p_approve boolean, p_reason text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_review_verification(p_request_id, p_approve, p_reason);
$$;

-- Company verification requests must point at a company the requester owns.
create or replace function public.verification_requests_check_subject()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'company' and not exists (
    select 1 from public.companies c where c.id = new.subject_id and c.owner_id = new.user_id
  ) then
    raise exception 'not_company_owner' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.verification_requests_check_subject() from public, anon, authenticated;

create trigger verification_requests_check_subject
  before insert on public.verification_requests
  for each row execute function public.verification_requests_check_subject();

-- Function grants
revoke execute on function private.is_company_member(uuid), private.is_company_public(uuid),
  private.create_company(text, text, public.company_size, text, text, boolean, boolean, text),
  private.request_company_verification(uuid, text), private.confirm_affiliation(uuid, boolean),
  private.admin_review_verification(uuid, boolean, text) from public, anon;
revoke execute on function public.is_company_member(uuid),
  public.create_company(text, text, public.company_size, text, text, boolean, boolean, text),
  public.request_company_verification(uuid, text), public.confirm_affiliation(uuid, boolean),
  public.admin_review_verification(uuid, boolean, text) from public, anon;

grant execute on function private.is_company_member(uuid),
  private.create_company(text, text, public.company_size, text, text, boolean, boolean, text),
  private.request_company_verification(uuid, text), private.confirm_affiliation(uuid, boolean),
  private.admin_review_verification(uuid, boolean, text) to authenticated;
grant execute on function public.is_company_member(uuid),
  public.create_company(text, text, public.company_size, text, text, boolean, boolean, text),
  public.request_company_verification(uuid, text), public.confirm_affiliation(uuid, boolean),
  public.admin_review_verification(uuid, boolean, text) to authenticated;
-- Used inside RLS policies evaluated for signed-out visitors too.
grant usage on schema private to anon;
grant execute on function private.is_company_public(uuid) to anon, authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_locations enable row level security;
alter table public.company_affiliations enable row level security;

revoke all on public.companies, public.company_members, public.company_locations, public.company_affiliations
  from anon, authenticated;

-- companies: public sees verified, non-hidden companies. Created only through create_company().
-- Verification fields, slug, owner and hidden_at are not in the update grant.
grant select on public.companies to anon, authenticated;
grant update (name, logo_path, industry, size, website, description, is_community_owned, leap_friendly)
  on public.companies to authenticated;

create policy companies_select_public on public.companies
  for select to anon
  using (verification_status = 'approved' and hidden_at is null);

create policy companies_select on public.companies
  for select to authenticated
  using (
    (verification_status = 'approved' and hidden_at is null)
    or owner_id = (select auth.uid())
    or (select private.is_company_member(id))
    or (select public.is_admin())
  );

create policy companies_update on public.companies
  for update to authenticated
  using ((select private.is_company_member(id)) or (select public.is_admin()))
  with check ((select private.is_company_member(id)) or (select public.is_admin()));

create trigger companies_audit after update or delete on public.companies
  for each row execute function public.audit_admin_change();

-- company_members: members see their company's member list. Rows are written by create_company() only (MVP).
grant select on public.company_members to authenticated;

create policy company_members_select on public.company_members
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_company_member(company_id)) or (select public.is_admin()));

-- company_locations: public for visible companies; members manage.
grant select on public.company_locations to anon, authenticated;
grant insert (company_id, city_id, address, location), update (city_id, address, location), delete
  on public.company_locations to authenticated;

create policy company_locations_select_public on public.company_locations
  for select to anon
  using (private.is_company_public(company_id));

create policy company_locations_select on public.company_locations
  for select to authenticated
  using (
    private.is_company_public(company_id)
    or (select private.is_company_member(company_id))
    or (select public.is_admin())
  );

create policy company_locations_insert on public.company_locations
  for insert to authenticated with check ((select private.is_company_member(company_id)));
create policy company_locations_update on public.company_locations
  for update to authenticated
  using ((select private.is_company_member(company_id)))
  with check ((select private.is_company_member(company_id)));
create policy company_locations_delete on public.company_locations
  for delete to authenticated using ((select private.is_company_member(company_id)));

-- company_affiliations: the user manages their own; company members and admins can see them.
grant select, delete on public.company_affiliations to authenticated;
grant insert (user_id, company_id) on public.company_affiliations to authenticated;

create policy company_affiliations_select on public.company_affiliations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_company_member(company_id))
    or (select public.is_admin())
  );

create policy company_affiliations_insert on public.company_affiliations
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_company_public(company_id));

create policy company_affiliations_delete on public.company_affiliations
  for delete to authenticated using (user_id = (select auth.uid()));
