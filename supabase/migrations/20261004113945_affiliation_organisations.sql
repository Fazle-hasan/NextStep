-- "Refer someone": members can add an organisation that is not on NextStep yet (D-046).
-- An affiliation now points either at a verified company (company_id) or at a typed organisation name.
-- Named affiliations are linked to a company when an admin verifies a company with the same name, never when a
-- company is merely registered (otherwise anyone could register a name to see who says they work there).
-- Referral links still need a company_id: they are for jobs posted on NextStep.

alter table public.company_affiliations
  alter column company_id drop not null,
  add column organisation_name text check (char_length(organisation_name) between 2 and 120),
  add constraint company_affiliations_target check (company_id is not null or organisation_name is not null);

-- One entry per typed name per person (case and spacing insensitive) while it is unlinked.
create unique index company_affiliations_user_org_idx
  on public.company_affiliations (user_id, lower(organisation_name))
  where company_id is null;
create index company_affiliations_unlinked_name_idx
  on public.company_affiliations (lower(organisation_name))
  where company_id is null;

-- Rules: tidy the name, link straight away when it matches a verified company, at most 10 entries per person.
create or replace function public.company_affiliations_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid;
begin
  if new.organisation_name is not null then
    new.organisation_name := regexp_replace(btrim(new.organisation_name), '\s+', ' ', 'g');
    if char_length(new.organisation_name) < 2 then
      raise exception 'organisation_name_required' using errcode = '22023';
    end if;
  end if;

  if new.company_id is null and new.organisation_name is not null then
    select c.id into v_company
    from public.companies c
    where lower(c.name) = lower(new.organisation_name)
      and c.verification_status = 'approved' and c.hidden_at is null
    order by c.verified_at
    limit 1;
    if v_company is not null then
      if exists (select 1 from public.company_affiliations a where a.user_id = new.user_id and a.company_id = v_company) then
        raise exception 'duplicate_affiliation' using errcode = '23505';
      end if;
      new.company_id := v_company;
    end if;
  end if;

  if (select auth.uid()) is not null then
    if (select count(*) from public.company_affiliations a where a.user_id = new.user_id) >= 10 then
      raise exception 'affiliation_limit_reached' using errcode = 'P0001';
    end if;
    perform public.check_rate_limit('affiliation', 20, interval '1 day');
  end if;
  return new;
end;
$$;

revoke execute on function public.company_affiliations_before_insert() from public, anon, authenticated;

create trigger company_affiliations_before_insert
  before insert on public.company_affiliations
  for each row execute function public.company_affiliations_before_insert();

-- Links unlinked affiliations whose name matches a newly verified company. Internal.
create or replace function private.link_affiliations_to_company(p_company_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_count integer;
begin
  select c.name into v_name from public.companies c where c.id = p_company_id;
  if v_name is null then
    return 0;
  end if;
  update public.company_affiliations a
  set company_id = p_company_id
  where a.company_id is null
    and lower(a.organisation_name) = lower(v_name)
    and not exists (
      select 1 from public.company_affiliations b where b.user_id = a.user_id and b.company_id = p_company_id
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function private.link_affiliations_to_company(uuid) from public, anon, authenticated;

-- admin_review_verification: approving a company now also links matching named affiliations.
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
  v_linked integer := 0;
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
    if p_approve then
      v_linked := private.link_affiliations_to_company(v_req.subject_id);
    end if;
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
    jsonb_build_object('kind', v_req.kind, 'subject_id', v_req.subject_id, 'user_id', v_req.user_id, 'reason', v_reason,
                       'affiliations_linked', v_linked)
  );
end;
$$;

-- RLS: a member can add an affiliation to a verified company or to a typed organisation name.
grant insert (user_id, company_id, organisation_name) on public.company_affiliations to authenticated;

alter policy company_affiliations_insert on public.company_affiliations
  with check (
    user_id = (select auth.uid())
    and (
      (company_id is not null and private.is_company_public(company_id))
      or (company_id is null and organisation_name is not null)
    )
  );
