-- M002 core enums and helpers

create type public.app_role as enum ('job_seeker', 'employer', 'mentor', 'buddy', 'flat_lister', 'admin');
create type public.gender as enum ('male', 'female');
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.verification_kind as enum ('company', 'mentor', 'buddy', 'flat_lister_id');

-- What the user said they are here for at onboarding (PRODUCT_SPEC §3). Roles are derived from these server-side.
create type public.onboarding_intent as enum ('find_job', 'hire', 'mentor', 'relocate', 'help_newcomers', 'list_flat');

-- Generic updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
