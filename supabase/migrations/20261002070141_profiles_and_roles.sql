-- M004 profiles and roles

-- Public-facing profile. Holds no phone or email (CLAUDE.md §4).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) between 1 and 120),
  gender public.gender,
  city_id uuid references public.cities (id) on delete set null,
  avatar_path text,
  bio text check (char_length(bio) <= 1000),
  intents public.onboarding_intent[] not null default '{}',
  onboarding_completed_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_city_id_idx on public.profiles (city_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Private contact details. Only the owner and admins can read.
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profile_private_set_updated_at
  before update on public.profile_private
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

-- Role helpers. Security definer so policies can read user_roles without recursion.
create or replace function public.has_role(role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = has_role.role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin'::public.app_role);
$$;

revoke execute on function public.has_role(public.app_role) from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Create profile rows when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '');
  v_phone text := nullif(btrim(coalesce(new.phone, '')), '');
begin
  if v_phone is not null and left(v_phone, 1) <> '+' then
    v_phone := '+' || v_phone;
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    v_phone := null;
  end if;

  insert into public.profiles (id, full_name)
  values (new.id, left(v_name, 120));

  insert into public.profile_private (user_id, phone)
  values (new.id, v_phone);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS ---------------------------------------------------------------------
-- Policies combine owner and admin conditions per operation (one permissive policy per role/action).

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.user_roles enable row level security;

revoke all on public.profiles, public.profile_private, public.user_roles from anon, authenticated;

-- profiles: insert only via handle_new_user. gender (a hard matching filter, D-013), suspended_at,
-- onboarding_completed_at and intents change only through security-definer RPCs (column grants below exclude them).
grant select on public.profiles to authenticated;
grant update (full_name, city_id, avatar_path, bio) on public.profiles to authenticated;

-- The select policy is created in M005 because it needs is_blocked_between().

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- profile_private
grant select on public.profile_private to authenticated;
grant insert (user_id, phone, whatsapp_opt_in) on public.profile_private to authenticated;
grant update (phone, whatsapp_opt_in) on public.profile_private to authenticated;

create policy profile_private_select on public.profile_private
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy profile_private_insert on public.profile_private
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy profile_private_update on public.profile_private
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- user_roles: users add/remove their own non-admin roles (D-014). Only admins grant admin.
grant select, delete on public.user_roles to authenticated;
grant insert (user_id, role) on public.user_roles to authenticated;

create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy user_roles_insert on public.user_roles
  for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and role <> 'admin'::public.app_role)
    or (select public.is_admin())
  );

create policy user_roles_delete on public.user_roles
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'admin'::public.app_role)
    or (select public.is_admin())
  );

-- Admin writes on reference tables from M003.
grant insert, update, delete on public.cities, public.neighbourhoods to authenticated;

create policy cities_admin_insert on public.cities
  for insert to authenticated with check ((select public.is_admin()));
create policy cities_admin_update on public.cities
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy cities_admin_delete on public.cities
  for delete to authenticated using ((select public.is_admin()));

create policy neighbourhoods_admin_insert on public.neighbourhoods
  for insert to authenticated with check ((select public.is_admin()));
create policy neighbourhoods_admin_update on public.neighbourhoods
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy neighbourhoods_admin_delete on public.neighbourhoods
  for delete to authenticated using ((select public.is_admin()));
