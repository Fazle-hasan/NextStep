-- M007 security-definer functions live in the unexposed `private` schema (D-022).
-- `public.*` keeps the same names as thin SECURITY INVOKER wrappers, so policies and RPC calls are unchanged,
-- while the definer code itself has no /rest/v1/rpc endpoint.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Role helpers ---------------------------------------------------------------

create or replace function private.has_role(role public.app_role)
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

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('admin'::public.app_role);
$$;

create or replace function private.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    ((select auth.uid()) is null or (select auth.uid()) in (a, b) or private.is_admin())
    and exists (
      select 1
      from public.blocks bl
      where (bl.blocker_id = a and bl.blocked_id = b)
         or (bl.blocker_id = b and bl.blocked_id = a)
    );
$$;

create or replace function public.has_role(role public.app_role)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_role(role);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_blocked_between(a, b);
$$;

-- Onboarding -----------------------------------------------------------------

alter function public.complete_onboarding(text, public.gender, uuid, public.onboarding_intent[], text, text)
  set schema private;

create or replace function public.complete_onboarding(
  p_full_name text,
  p_gender public.gender,
  p_city_id uuid,
  p_intents public.onboarding_intent[],
  p_phone text default null,
  p_verification_note text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.complete_onboarding(p_full_name, p_gender, p_city_id, p_intents, p_phone, p_verification_note);
$$;

-- Grants -------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon;
grant execute on function private.has_role(public.app_role) to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function private.complete_onboarding(text, public.gender, uuid, public.onboarding_intent[], text, text) to authenticated;

revoke execute on function public.has_role(public.app_role) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke execute on function public.complete_onboarding(text, public.gender, uuid, public.onboarding_intent[], text, text) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.complete_onboarding(text, public.gender, uuid, public.onboarding_intent[], text, text) to authenticated;

-- Future functions in `private` are not executable by API roles unless granted explicitly.
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;
