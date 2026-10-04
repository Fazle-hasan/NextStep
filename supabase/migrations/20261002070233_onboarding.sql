-- M006 onboarding RPC (PRODUCT_SPEC §3, D-014).
-- Roles are derived from intents server-side; the client never sends roles.

create or replace function public.complete_onboarding(
  p_full_name text,
  p_gender public.gender,
  p_city_id uuid,
  p_intents public.onboarding_intent[],
  p_phone text default null,
  p_verification_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_full_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_note text := nullif(btrim(coalesce(p_verification_note, '')), '');
  v_roles public.app_role[];
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if exists (select 1 from public.profiles p where p.id = v_uid and p.suspended_at is not null) then
    raise exception 'account_suspended' using errcode = 'P0001';
  end if;

  if char_length(v_name) not between 1 and 120 then
    raise exception 'invalid_full_name' using errcode = '22023';
  end if;
  if p_gender is null then
    raise exception 'gender_required' using errcode = '22023';
  end if;
  if p_city_id is null or not exists (select 1 from public.cities c where c.id = p_city_id and c.is_active) then
    raise exception 'invalid_city' using errcode = '22023';
  end if;
  if p_intents is null or cardinality(p_intents) = 0 then
    raise exception 'intents_required' using errcode = '22023';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;

  -- India-only phone numbers at launch (D-006).
  if v_phone is not null and v_phone !~ '^\+91[6-9][0-9]{9}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;

  update public.profile_private pp
  set phone = coalesce(v_phone, pp.phone)
  where pp.user_id = v_uid;

  if not exists (select 1 from public.profile_private pp where pp.user_id = v_uid and pp.phone is not null) then
    raise exception 'phone_required' using errcode = '22023';
  end if;

  update public.profiles p
  set full_name = v_name,
      gender = coalesce(p.gender, p_gender),
      city_id = p_city_id,
      intents = array(select distinct i from unnest(p.intents || p_intents) as t (i) order by i),
      onboarding_completed_at = coalesce(p.onboarding_completed_at, now())
  where p.id = v_uid;

  select array_agg(distinct r) into v_roles
  from unnest(p_intents) as t (i)
  cross join lateral (
    select case t.i
      when 'find_job' then 'job_seeker'::public.app_role
      when 'relocate' then 'job_seeker'::public.app_role
      when 'hire' then 'employer'::public.app_role
      when 'mentor' then 'mentor'::public.app_role
      when 'help_newcomers' then 'buddy'::public.app_role
      when 'list_flat' then 'flat_lister'::public.app_role
    end as r
  ) m;

  insert into public.user_roles (user_id, role)
  select v_uid, r from unnest(v_roles) as t (r)
  on conflict (user_id, role) do nothing;

  -- Mentors and buddies go to the admin verification queue. Employers are verified per company (Phase 2).
  insert into public.verification_requests (user_id, kind, applicant_note)
  select v_uid, k.kind, v_note
  from (values
    ('mentor'::public.verification_kind, 'mentor'::public.app_role),
    ('buddy'::public.verification_kind, 'buddy'::public.app_role)
  ) as k (kind, role)
  where k.role = any (v_roles)
    and not exists (
      select 1 from public.verification_requests vr
      where vr.user_id = v_uid and vr.kind = k.kind and vr.status in ('pending', 'approved')
    );
end;
$$;

revoke execute on function public.complete_onboarding(text, public.gender, uuid, public.onboarding_intent[], text, text) from public, anon;
grant execute on function public.complete_onboarding(text, public.gender, uuid, public.onboarding_intent[], text, text) to authenticated;
