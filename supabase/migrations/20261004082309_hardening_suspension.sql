-- Phase 7 hardening: close the gaps found in the RLS audit around suspended accounts.
--   1. Suspending a user now also hides the companies they own (which takes their jobs out of search and
--      public pages) and their area tips. Listings, mentor, buddy and flatmate profiles already check
--      suspended_at in RLS. Lifting a suspension does not un-hide: an admin restores content deliberately.
--   2. A suspended company member can no longer create or edit jobs.

create or replace function private.is_active_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.suspended_at is null
  );
$$;

revoke execute on function private.is_active_user() from public, anon, authenticated;
grant execute on function private.is_active_user() to authenticated;

alter policy jobs_insert on public.jobs
  with check (
    (select private.is_company_member(company_id))
    and posted_by = (select auth.uid())
    and (select private.is_active_user())
  );

alter policy jobs_update on public.jobs
  using ((select private.is_company_member(company_id)) and (select private.is_active_user()))
  with check ((select private.is_company_member(company_id)) and (select private.is_active_user()));

create or replace function private.admin_set_user_suspension(p_user_id uuid, p_suspend boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_companies integer := 0;
  v_tips integer := 0;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_suspend_self' using errcode = 'P0001';
  end if;
  if p_suspend and exists (select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'admin') then
    raise exception 'cannot_suspend_admin' using errcode = 'P0001';
  end if;
  if p_suspend and (v_reason is null or char_length(v_reason) > 500) then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  update public.profiles
  set suspended_at = case when p_suspend then coalesce(suspended_at, now()) end
  where id = p_user_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  if p_suspend then
    update public.companies set hidden_at = now() where owner_id = p_user_id and hidden_at is null;
    get diagnostics v_companies = row_count;
    update public.area_tips set hidden_at = now() where author_id = p_user_id and hidden_at is null and deleted_at is null;
    get diagnostics v_tips = row_count;
  end if;

  perform public.log_admin_action(
    case when p_suspend then 'user_suspended' else 'user_unsuspended' end,
    'profiles', p_user_id,
    jsonb_build_object('reason', v_reason, 'companies_hidden', v_companies, 'tips_hidden', v_tips)
  );
end;
$$;
