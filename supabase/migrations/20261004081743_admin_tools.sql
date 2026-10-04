-- Phase 6 / M021 admin tools (PRODUCT_SPEC §10): moderation actions, user suspension, place suggestion
-- review, flat-lister ID badge, analytics. Every action is admin-only, runs through a definer RPC and
-- writes to audit_log (D-015, D-022).

-- Flat-lister ID badge (PRODUCT_SPEC §2: optional, after admin approval). Not writable by API roles.
alter table public.profiles add column lister_verified_at timestamptz;

-- request_lister_verification: a lister asks for the ID-verified badge.
create or replace function private.request_lister_verification(p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not private.has_role('flat_lister') then
    raise exception 'not_a_lister' using errcode = 'P0001';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_uid and p.lister_verified_at is not null) then
    raise exception 'already_verified' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.verification_requests vr
    where vr.user_id = v_uid and vr.kind = 'flat_lister_id' and vr.status = 'pending'
  ) then
    raise exception 'already_requested' using errcode = 'P0001';
  end if;
  insert into public.verification_requests (user_id, kind, applicant_note) values (v_uid, 'flat_lister_id', v_note);
end;
$$;

create or replace function public.request_lister_verification(p_note text default null)
returns void
language sql security invoker set search_path = ''
as $$
  select private.request_lister_verification(p_note);
$$;

-- admin_review_verification: now also grants the flat-lister ID badge.
create or replace function private.admin_review_verification(p_request_id uuid, p_approve boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.verification_requests;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status public.verification_status := case when p_approve then 'approved' else 'rejected' end;
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
  set status = v_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      rejection_reason = case when p_approve then null else v_reason end
  where id = p_request_id;

  if v_req.kind = 'company' then
    update public.companies
    set verification_status = v_status,
        verified_at = case when p_approve then now() end
    where id = v_req.subject_id;
  elsif v_req.kind = 'mentor' then
    update public.mentor_profiles
    set verification_status = v_status,
        verified_at = case when p_approve then now() end
    where user_id = v_req.user_id;
  elsif v_req.kind = 'buddy' then
    update public.buddy_profiles
    set verification_status = v_status,
        verified_at = case when p_approve then now() end
    where user_id = v_req.user_id;
  elsif v_req.kind = 'flat_lister_id' and p_approve then
    update public.profiles set lister_verified_at = now() where id = v_req.user_id;
  end if;

  perform public.log_admin_action(
    case when p_approve then 'verification_approved' else 'verification_rejected' end,
    'verification_requests', p_request_id,
    jsonb_build_object('kind', v_req.kind, 'subject_id', v_req.subject_id, 'user_id', v_req.user_id, 'reason', v_reason)
  );
end;
$$;

-- admin_set_user_suspension: suspends or restores an account. Suspended users cannot post, message, book
-- or be seen (the checks are in RLS and the RPCs). Admins cannot be suspended.
create or replace function private.admin_set_user_suspension(p_user_id uuid, p_suspend boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
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

  perform public.log_admin_action(
    case when p_suspend then 'user_suspended' else 'user_unsuspended' end,
    'profiles', p_user_id, jsonb_build_object('reason', v_reason)
  );
end;
$$;

create or replace function public.admin_set_user_suspension(p_user_id uuid, p_suspend boolean, p_reason text default null)
returns void
language sql security invoker set search_path = ''
as $$
  select private.admin_set_user_suspension(p_user_id, p_suspend, p_reason);
$$;

-- The user a report is about (the owner of the reported content).
create or replace function private.report_target_owner(p_type public.report_target_type, p_target_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select case p_type
    when 'user' then (select p.id from public.profiles p where p.id = p_target_id)
    when 'company' then (select c.owner_id from public.companies c where c.id = p_target_id)
    when 'job' then (select j.posted_by from public.jobs j where j.id = p_target_id)
    when 'flat_listing' then (select l.lister_id from public.flat_listings l where l.id = p_target_id)
    when 'relocation_request' then (select r.user_id from public.relocation_requests r where r.id = p_target_id)
    when 'review' then (select br.rater_id from public.buddy_ratings br where br.id = p_target_id)
    when 'area_tip' then (select t.author_id from public.area_tips t where t.id = p_target_id)
    when 'message' then (select m.sender_id from public.messages m where m.id = p_target_id)
    when 'place_suggestion' then (select s.user_id from public.place_suggestions s where s.id = p_target_id)
  end;
$$;

-- admin_resolve_report: p_action is 'dismiss', 'hide', 'warn' or 'suspend'.
--   dismiss: nothing happens to the content.
--   hide:    the reported content gets hidden_at (not available for a reported user: suspend instead).
--   warn:    the owner receives a notification with the admin's note.
--   suspend: the owner's account is suspended (and the content of a non-user report is hidden too).
create or replace function private.admin_resolve_report(p_report_id uuid, p_action text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_owner uuid;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('dismiss', 'hide', 'warn', 'suspend') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;
  if p_action in ('warn', 'suspend') and v_note is null then
    raise exception 'note_required' using errcode = '22023';
  end if;

  select * into v_report from public.reports r where r.id = p_report_id for update;
  if not found then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;
  if v_report.status <> 'open' then
    raise exception 'report_already_resolved' using errcode = 'P0001';
  end if;

  v_owner := private.report_target_owner(v_report.target_type, v_report.target_id);

  if p_action = 'hide' and v_report.target_type = 'user' then
    raise exception 'cannot_hide_user' using errcode = 'P0001';
  end if;

  if p_action in ('hide', 'suspend') then
    case v_report.target_type
      when 'company' then update public.companies set hidden_at = coalesce(hidden_at, now()) where id = v_report.target_id;
      when 'job' then update public.jobs set hidden_at = coalesce(hidden_at, now()) where id = v_report.target_id;
      when 'flat_listing' then update public.flat_listings set hidden_at = coalesce(hidden_at, now()) where id = v_report.target_id;
      when 'relocation_request' then update public.relocation_requests set hidden_at = coalesce(hidden_at, now()) where id = v_report.target_id;
      when 'review' then update public.buddy_ratings set hidden_at = coalesce(hidden_at, now()) where id = v_report.target_id;
      when 'area_tip' then update public.area_tips set hidden_at = coalesce(hidden_at, now()) where id = v_report.target_id;
      when 'message' then update public.messages set hidden_at = coalesce(hidden_at, now()) where id = v_report.target_id;
      when 'place_suggestion' then
        update public.place_suggestions
        set status = 'rejected', reviewed_by = (select auth.uid()), reviewed_at = now(), review_note = v_note
        where id = v_report.target_id and status = 'pending';
      else null;
    end case;
  end if;

  if p_action = 'warn' and v_owner is not null then
    perform private.notify(v_owner, 'moderation_warning', 'A message from the NextStep team', v_note, null);
  end if;

  if p_action = 'suspend' then
    if v_owner is null then
      raise exception 'user_not_found' using errcode = 'P0002';
    end if;
    perform private.admin_set_user_suspension(v_owner, true, v_note);
  end if;

  update public.reports
  set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end::public.report_status,
      resolved_by = (select auth.uid()),
      resolved_at = now(),
      resolution_note = v_note
  where id = p_report_id;

  perform public.log_admin_action(
    'report_' || p_action, 'reports', p_report_id,
    jsonb_build_object('target_type', v_report.target_type, 'target_id', v_report.target_id,
                       'owner_id', v_owner, 'note', v_note)
  );
end;
$$;

create or replace function public.admin_resolve_report(p_report_id uuid, p_action text, p_note text default null)
returns void
language sql security invoker set search_path = ''
as $$
  select private.admin_resolve_report(p_report_id, p_action, p_note);
$$;

-- admin_set_content_hidden: hide or restore a piece of content outside a report (e.g. an area tip).
create or replace function private.admin_set_content_hidden(p_type public.report_target_type, p_target_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_at timestamptz := case when p_hidden then now() end;
  v_found boolean := false;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  case p_type
    when 'company' then update public.companies set hidden_at = v_at where id = p_target_id; v_found := found;
    when 'job' then update public.jobs set hidden_at = v_at where id = p_target_id; v_found := found;
    when 'flat_listing' then update public.flat_listings set hidden_at = v_at where id = p_target_id; v_found := found;
    when 'relocation_request' then update public.relocation_requests set hidden_at = v_at where id = p_target_id; v_found := found;
    when 'review' then update public.buddy_ratings set hidden_at = v_at where id = p_target_id; v_found := found;
    when 'area_tip' then update public.area_tips set hidden_at = v_at where id = p_target_id; v_found := found;
    when 'message' then update public.messages set hidden_at = v_at where id = p_target_id; v_found := found;
    else raise exception 'invalid_target' using errcode = '22023';
  end case;
  if not v_found then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action(
    case when p_hidden then 'content_hidden' else 'content_restored' end,
    p_type::text, p_target_id, '{}'::jsonb
  );
end;
$$;

create or replace function public.admin_set_content_hidden(p_type public.report_target_type, p_target_id uuid, p_hidden boolean)
returns void
language sql security invoker set search_path = ''
as $$
  select private.admin_set_content_hidden(p_type, p_target_id, p_hidden);
$$;

-- admin_review_place_suggestion: approving a new-place suggestion creates a verified place from its payload;
-- approving a correction applies the proposed fields to the place. Returns the place id (null on rejection).
create or replace function private.admin_review_place_suggestion(p_suggestion_id uuid, p_approve boolean, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.place_suggestions;
  v_p jsonb;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_point extensions.geography;
  v_place_id uuid;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;

  select * into v_s from public.place_suggestions s where s.id = p_suggestion_id for update;
  if not found then
    raise exception 'suggestion_not_found' using errcode = 'P0002';
  end if;
  if v_s.status <> 'pending' then
    raise exception 'suggestion_already_decided' using errcode = 'P0001';
  end if;
  v_p := v_s.payload;
  v_place_id := v_s.place_id;

  if p_approve then
    if (v_p ->> 'lat') is not null and (v_p ->> 'lng') is not null then
      v_point := extensions.st_point((v_p ->> 'lng')::double precision, (v_p ->> 'lat')::double precision, 4326)::extensions.geography;
    end if;

    if v_s.place_id is null then
      if nullif(btrim(coalesce(v_p ->> 'name', '')), '') is null or (v_p ->> 'place_type') is null or (v_p ->> 'city_id') is null then
        raise exception 'suggestion_incomplete' using errcode = 'P0001';
      end if;
      -- No pin given: fall back to the neighbourhood centre, then the city centre.
      if v_point is null then
        select coalesce(
          (select n.center from public.neighbourhoods n where n.id = nullif(v_p ->> 'neighbourhood_id', '')::uuid),
          (select c.center from public.cities c where c.id = (v_p ->> 'city_id')::uuid)
        ) into v_point;
      end if;
      if v_point is null then
        raise exception 'suggestion_incomplete' using errcode = 'P0001';
      end if;
      insert into public.places (name, place_type, address, location, city_id, neighbourhood_id, phone, website,
        timings, notes, is_verified, created_by)
      values (
        left(btrim(v_p ->> 'name'), 150), (v_p ->> 'place_type')::public.place_type, left(v_p ->> 'address', 300), v_point,
        (v_p ->> 'city_id')::uuid, nullif(v_p ->> 'neighbourhood_id', '')::uuid, left(v_p ->> 'phone', 30),
        case when (v_p ->> 'website') ~ '^https?://' then left(v_p ->> 'website', 300) end,
        left(v_p ->> 'timings', 1000), left(v_p ->> 'notes', 2000), true, (select auth.uid())
      )
      returning id into v_place_id;
    else
      update public.places p
      set name = coalesce(left(nullif(btrim(v_p ->> 'name'), ''), 150), p.name),
          place_type = coalesce((v_p ->> 'place_type')::public.place_type, p.place_type),
          address = coalesce(left(v_p ->> 'address', 300), p.address),
          phone = coalesce(left(v_p ->> 'phone', 30), p.phone),
          website = coalesce(case when (v_p ->> 'website') ~ '^https?://' then left(v_p ->> 'website', 300) end, p.website),
          timings = coalesce(left(v_p ->> 'timings', 1000), p.timings),
          notes = coalesce(left(v_p ->> 'notes', 2000), p.notes),
          location = coalesce(v_point, p.location)
      where p.id = v_s.place_id;
    end if;
  end if;

  update public.place_suggestions
  set status = case when p_approve then 'approved' else 'rejected' end::public.verification_status,
      reviewed_by = (select auth.uid()), reviewed_at = now(), review_note = v_note,
      place_id = coalesce(place_id, case when p_approve then v_place_id end)
  where id = p_suggestion_id;

  perform public.log_admin_action(
    case when p_approve then 'place_suggestion_approved' else 'place_suggestion_rejected' end,
    'place_suggestions', p_suggestion_id, jsonb_build_object('place_id', v_place_id, 'note', v_note)
  );
  return case when p_approve then v_place_id end;
end;
$$;

create or replace function public.admin_review_place_suggestion(p_suggestion_id uuid, p_approve boolean, p_note text default null)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.admin_review_place_suggestion(p_suggestion_id, p_approve, p_note);
$$;

-- admin_analytics: headline numbers for a date range (inclusive, IST days), optionally for one city,
-- plus a per-city breakdown.
create or replace function private.admin_analytics(p_from date, p_to date, p_city_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := (coalesce(p_from, current_date - 29)::timestamp at time zone 'Asia/Kolkata');
  v_to timestamptz := ((coalesce(p_to, current_date) + 1)::timestamp at time zone 'Asia/Kolkata');
  v_result jsonb;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if v_to <= v_from then
    raise exception 'invalid_range' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'from', coalesce(p_from, current_date - 29),
    'to', coalesce(p_to, current_date),
    'signups', (select count(*) from public.profiles p
                where p.created_at >= v_from and p.created_at < v_to and (p_city_id is null or p.city_id = p_city_id)),
    'signups_by_role', (
      select coalesce(jsonb_object_agg(t.role, t.n), '{}'::jsonb) from (
        select ur.role::text as role, count(*) as n
        from public.user_roles ur join public.profiles p on p.id = ur.user_id
        where ur.created_at >= v_from and ur.created_at < v_to and (p_city_id is null or p.city_id = p_city_id)
        group by ur.role) t),
    'jobs_posted', (select count(*) from public.jobs j
                    where j.published_at >= v_from and j.published_at < v_to and (p_city_id is null or j.city_id = p_city_id)),
    'applications', (select count(*) from public.job_applications a join public.jobs j on j.id = a.job_id
                     where a.created_at >= v_from and a.created_at < v_to and (p_city_id is null or j.city_id = p_city_id)),
    'hires', (select count(*) from public.application_status_history h
              join public.job_applications a on a.id = h.application_id join public.jobs j on j.id = a.job_id
              where h.to_status = 'hired' and h.created_at >= v_from and h.created_at < v_to
                and (p_city_id is null or j.city_id = p_city_id)),
    'mentorship_sessions_booked', (select count(*) from public.mentorship_sessions s
              join public.mentor_profiles m on m.user_id = s.mentor_id
              where s.created_at >= v_from and s.created_at < v_to and (p_city_id is null or m.city_id = p_city_id)),
    'mentorship_sessions_completed', (select count(*) from public.mentorship_sessions s
              join public.mentor_profiles m on m.user_id = s.mentor_id
              where s.status = 'completed' and s.ends_at >= v_from and s.ends_at < v_to
                and (p_city_id is null or m.city_id = p_city_id)),
    'relocation_requests_opened', (select count(*) from public.relocation_requests r
              where r.created_at >= v_from and r.created_at < v_to and (p_city_id is null or r.city_id = p_city_id)),
    'relocation_requests_closed', (select count(*) from public.relocation_requests r
              where r.status = 'closed' and r.closed_at >= v_from and r.closed_at < v_to
                and (p_city_id is null or r.city_id = p_city_id)),
    'listings_created', (select count(*) from public.flat_listings l
              where l.created_at >= v_from and l.created_at < v_to and (p_city_id is null or l.city_id = p_city_id)),
    'active_listings', (select count(*) from public.flat_listings l
              where l.status = 'active' and l.deleted_at is null and l.hidden_at is null and l.expires_at > now()
                and (p_city_id is null or l.city_id = p_city_id)),
    'open_reports', (select count(*) from public.reports r where r.status = 'open'),
    'pending_verifications', (select count(*) from public.verification_requests v where v.status = 'pending'),
    'by_city', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'city_id', c.id, 'city', c.name,
        'signups', (select count(*) from public.profiles p where p.city_id = c.id and p.created_at >= v_from and p.created_at < v_to),
        'jobs_posted', (select count(*) from public.jobs j where j.city_id = c.id and j.published_at >= v_from and j.published_at < v_to),
        'applications', (select count(*) from public.job_applications a join public.jobs j on j.id = a.job_id
                         where j.city_id = c.id and a.created_at >= v_from and a.created_at < v_to),
        'relocation_requests', (select count(*) from public.relocation_requests r
                         where r.city_id = c.id and r.created_at >= v_from and r.created_at < v_to),
        'active_listings', (select count(*) from public.flat_listings l
                         where l.city_id = c.id and l.status = 'active' and l.deleted_at is null and l.hidden_at is null
                           and l.expires_at > now())
      ) order by c.name), '[]'::jsonb)
      from public.cities c where c.is_active)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_analytics(p_from date default null, p_to date default null, p_city_id uuid default null)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select private.admin_analytics(p_from, p_to, p_city_id);
$$;

revoke execute on function
  private.request_lister_verification(text),
  private.admin_set_user_suspension(uuid, boolean, text),
  private.report_target_owner(public.report_target_type, uuid),
  private.admin_resolve_report(uuid, text, text),
  private.admin_set_content_hidden(public.report_target_type, uuid, boolean),
  private.admin_review_place_suggestion(uuid, boolean, text),
  private.admin_analytics(date, date, uuid)
  from public, anon, authenticated;
revoke execute on function
  public.request_lister_verification(text),
  public.admin_set_user_suspension(uuid, boolean, text),
  public.admin_resolve_report(uuid, text, text),
  public.admin_set_content_hidden(public.report_target_type, uuid, boolean),
  public.admin_review_place_suggestion(uuid, boolean, text),
  public.admin_analytics(date, date, uuid)
  from public, anon;
grant execute on function
  private.request_lister_verification(text),
  private.admin_set_user_suspension(uuid, boolean, text),
  private.admin_resolve_report(uuid, text, text),
  private.admin_set_content_hidden(public.report_target_type, uuid, boolean),
  private.admin_review_place_suggestion(uuid, boolean, text),
  private.admin_analytics(date, date, uuid)
  to authenticated;
grant execute on function
  public.request_lister_verification(text),
  public.admin_set_user_suspension(uuid, boolean, text),
  public.admin_resolve_report(uuid, text, text),
  public.admin_set_content_hidden(public.report_target_type, uuid, boolean),
  public.admin_review_place_suggestion(uuid, boolean, text),
  public.admin_analytics(date, date, uuid)
  to authenticated;

-- Moderation needs admins to read and resolve reports, and to read every reported row.
-- reports: admins could already select; the resolve RPC performs the update (no direct update grant).
-- Admin read access on tables whose policies were owner/participant only is already in place
-- (each select policy includes is_admin()).

-- audit_log and reports: index for the admin screens.
create index if not exists audit_log_action_idx on public.audit_log (action, created_at desc);
