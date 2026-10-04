-- Phase 4 / M014 Settle In: buddy profiles, relocation requests, offers, buddy ratings (PRODUCT_SPEC §7.1–7.2).
-- Offer and request status change only through RPCs (D-015). Accepting an offer opens a conversation.

create type public.relocation_need as enum (
  'flat', 'flatmate', 'area_guidance', 'nearby_masjid', 'halal_food', 'pickup', 'temporary_stay', 'general_advice'
);
create type public.household_type as enum ('alone', 'family', 'with_flatmates');
create type public.request_status as enum ('open', 'closed', 'cancelled');
-- Shared by relocation offers, flat contact requests and flatmate connections.
create type public.offer_status as enum ('pending', 'accepted', 'declined', 'withdrawn');

-- Buddy profiles -------------------------------------------------------------------

create table public.buddy_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete restrict,
  neighbourhood_ids uuid[] not null default '{}' check (cardinality(neighbourhood_ids) <= 20),
  bio text check (char_length(bio) <= 1000),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  help_types public.relocation_need[] not null default '{general_advice}' check (cardinality(help_types) between 1 and 8),
  is_active boolean not null default true,
  -- Set by admin_review_verification(); not in the update grant.
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  -- Kept current by a trigger on buddy_ratings; not in the update grant.
  rating_avg numeric(3, 2),
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index buddy_profiles_listing_idx on public.buddy_profiles (city_id, verification_status, is_active);

create trigger buddy_profiles_set_updated_at
  before update on public.buddy_profiles
  for each row execute function public.set_updated_at();

-- Relocation requests ----------------------------------------------------------------

create table public.relocation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete restrict,
  neighbourhood_ids uuid[] not null default '{}' check (cardinality(neighbourhood_ids) <= 20),
  move_from date not null,
  move_to date,
  -- Optional; visible to eligible buddies in the city. The map pin picker arrives with the maps module.
  workplace_location extensions.geography(point, 4326),
  workplace_address text check (char_length(workplace_address) <= 300),
  -- Monthly budget in paise.
  budget_min integer check (budget_min >= 0),
  budget_max integer check (budget_max >= 0),
  currency char(3) not null default 'INR',
  household public.household_type not null,
  needs public.relocation_need[] not null check (cardinality(needs) between 1 and 8),
  note text check (char_length(note) <= 1000),
  same_gender_buddies_only boolean not null default false,
  status public.request_status not null default 'open',
  closed_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (move_to is null or move_to >= move_from),
  check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

create index relocation_requests_user_id_idx on public.relocation_requests (user_id, created_at desc);
create index relocation_requests_city_status_idx on public.relocation_requests (city_id, status, created_at desc);
create index relocation_requests_workplace_gix on public.relocation_requests using gist (workplace_location);

create trigger relocation_requests_set_updated_at
  before update on public.relocation_requests
  for each row execute function public.set_updated_at();

create table public.relocation_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.relocation_requests (id) on delete cascade,
  buddy_id uuid not null references public.profiles (id) on delete cascade,
  message text check (char_length(message) <= 1000),
  status public.offer_status not null default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, buddy_id)
);

create index relocation_offers_buddy_id_idx on public.relocation_offers (buddy_id, created_at desc);

create trigger relocation_offers_set_updated_at
  before update on public.relocation_offers
  for each row execute function public.set_updated_at();

create table public.buddy_ratings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.relocation_requests (id) on delete cascade,
  buddy_id uuid not null references public.profiles (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, buddy_id)
);

create index buddy_ratings_buddy_id_idx on public.buddy_ratings (buddy_id);
create index buddy_ratings_rater_id_idx on public.buddy_ratings (rater_id);

create trigger buddy_ratings_set_updated_at
  before update on public.buddy_ratings
  for each row execute function public.set_updated_at();

-- Helpers (definer, so policies do not recurse through each other's RLS) ----------

-- True when the caller is a verified, active buddy in p_city who may see a request by p_requester:
-- not suspended, no block either way, and the same gender when the requester asked for that.
create or replace function private.is_eligible_buddy_for(p_city uuid, p_requester uuid, p_same_gender boolean)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.buddy_profiles b
    join public.profiles bp on bp.id = b.user_id
    join public.profiles rp on rp.id = p_requester
    where b.user_id = (select auth.uid())
      and b.user_id <> p_requester
      and b.verification_status = 'approved'
      and b.is_active
      and b.city_id = p_city
      and bp.suspended_at is null
      and rp.suspended_at is null
      and (not p_same_gender or (bp.gender is not null and bp.gender = rp.gender))
      and not exists (
        select 1 from public.blocks bl
        where (bl.blocker_id = b.user_id and bl.blocked_id = p_requester)
           or (bl.blocker_id = p_requester and bl.blocked_id = b.user_id)
      )
  );
$$;

create or replace function private.is_my_relocation_request(p_request_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.relocation_requests r
    where r.id = p_request_id and r.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_offered_on_request(p_request_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.relocation_offers o
    where o.request_id = p_request_id and o.buddy_id = (select auth.uid())
  );
$$;

-- A requester can see a buddy who offered on one of their requests, or verified buddies in a city
-- where they have an open request (respecting blocks).
create or replace function private.can_view_buddy(p_buddy_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.relocation_offers o
    join public.relocation_requests r on r.id = o.request_id
    where o.buddy_id = p_buddy_id and r.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.buddy_profiles b
    join public.profiles bp on bp.id = b.user_id
    join public.relocation_requests r on r.city_id = b.city_id
    where b.user_id = p_buddy_id
      and b.verification_status = 'approved'
      and b.is_active
      and bp.suspended_at is null
      and r.user_id = (select auth.uid())
      and r.status = 'open'
      and not private.is_blocked_between((select auth.uid()), p_buddy_id)
  );
$$;

-- Buddy profile rules: the buddy role and a verification request are added on creation,
-- and an already-approved request carries over.
create or replace function public.buddy_profiles_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest public.verification_status;
begin
  insert into public.user_roles (user_id, role) values (new.user_id, 'buddy')
  on conflict (user_id, role) do nothing;

  select vr.status into v_latest
  from public.verification_requests vr
  where vr.user_id = new.user_id and vr.kind = 'buddy'
  order by vr.created_at desc
  limit 1;

  if v_latest is null or v_latest = 'rejected' then
    insert into public.verification_requests (user_id, kind) values (new.user_id, 'buddy');
    v_latest := 'pending';
  end if;
  new.verification_status := v_latest;
  new.verified_at := case when v_latest = 'approved' then now() end;
  new.rating_avg := null;
  new.rating_count := 0;
  return new;
end;
$$;

revoke execute on function public.buddy_profiles_before_insert() from public, anon, authenticated;

create trigger buddy_profiles_before_insert
  before insert on public.buddy_profiles
  for each row execute function public.buddy_profiles_before_insert();

-- Request rules: finished onboarding, at most 3 open requests, 5 new requests a day.
create or replace function public.relocation_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = new.user_id and p.onboarding_completed_at is not null and p.suspended_at is null
  ) then
    raise exception 'onboarding_required' using errcode = 'P0001';
  end if;
  if (select count(*) from public.relocation_requests r
      where r.user_id = new.user_id and r.status = 'open') >= 3 then
    raise exception 'open_request_limit' using errcode = 'P0001';
  end if;
  perform public.check_rate_limit('relocation_request', 5, interval '1 day');
  return new;
end;
$$;

revoke execute on function public.relocation_requests_before_insert() from public, anon, authenticated;

create trigger relocation_requests_before_insert
  before insert on public.relocation_requests
  for each row execute function public.relocation_requests_before_insert();

-- Keeps buddy_profiles.rating_avg / rating_count current.
create or replace function public.buddy_ratings_sync_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buddy uuid := coalesce(new.buddy_id, old.buddy_id);
begin
  update public.buddy_profiles b
  set (rating_avg, rating_count) = (
    select round(avg(r.rating)::numeric, 2), count(*)::int
    from public.buddy_ratings r
    where r.buddy_id = v_buddy and r.hidden_at is null
  )
  where b.user_id = v_buddy;
  return null;
end;
$$;

revoke execute on function public.buddy_ratings_sync_rating() from public, anon, authenticated;

create trigger buddy_ratings_sync_rating
  after insert or update or delete on public.buddy_ratings
  for each row execute function public.buddy_ratings_sync_rating();

-- RPCs ---------------------------------------------------------------------------

-- offer_help: a verified buddy in the request's city offers to help. A withdrawn offer can be sent again.
create or replace function private.offer_help(p_request_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request public.relocation_requests;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_existing public.relocation_offers;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(v_message) > 1000 then
    raise exception 'message_too_long' using errcode = '22023';
  end if;

  select * into v_request from public.relocation_requests r where r.id = p_request_id;
  if not found or v_request.status <> 'open' or v_request.hidden_at is not null
     or not private.is_eligible_buddy_for(v_request.city_id, v_request.user_id, v_request.same_gender_buddies_only) then
    raise exception 'request_not_available' using errcode = 'P0001';
  end if;

  select * into v_existing from public.relocation_offers o
  where o.request_id = p_request_id and o.buddy_id = v_uid
  for update;
  if found and v_existing.status <> 'withdrawn' then
    raise exception 'already_offered' using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('relocation_offer', 20, interval '1 day');

  if v_existing.id is not null then
    update public.relocation_offers
    set status = 'pending', message = v_message, decided_at = null
    where id = v_existing.id;
    return v_existing.id;
  end if;

  insert into public.relocation_offers (request_id, buddy_id, message)
  values (p_request_id, v_uid, v_message)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.offer_help(p_request_id uuid, p_message text default null)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.offer_help(p_request_id, p_message);
$$;

-- respond_to_offer: the requester accepts or declines. Accepting opens a conversation and returns its id.
create or replace function private.respond_to_offer(p_offer_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_offer public.relocation_offers;
  v_request public.relocation_requests;
begin
  select * into v_offer from public.relocation_offers o where o.id = p_offer_id for update;
  if found then
    select * into v_request from public.relocation_requests r where r.id = v_offer.request_id;
  end if;
  if v_offer.id is null or v_request.user_id is distinct from v_uid then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'offer_already_decided' using errcode = 'P0001';
  end if;
  if v_request.status <> 'open' then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;

  if not p_accept then
    update public.relocation_offers set status = 'declined', decided_at = now() where id = p_offer_id;
    return null;
  end if;

  if private.is_blocked_between(v_uid, v_offer.buddy_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  update public.relocation_offers set status = 'accepted', decided_at = now() where id = p_offer_id;
  return private.open_conversation('relocation_offer', p_offer_id, v_uid, v_offer.buddy_id);
end;
$$;

create or replace function public.respond_to_offer(p_offer_id uuid, p_accept boolean)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.respond_to_offer(p_offer_id, p_accept);
$$;

-- withdraw_offer: the buddy takes back a pending offer.
create or replace function private.withdraw_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.relocation_offers
  set status = 'withdrawn', decided_at = now()
  where id = p_offer_id and buddy_id = (select auth.uid()) and status = 'pending';
  if not found then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.withdraw_offer(p_offer_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.withdraw_offer(p_offer_id);
$$;

-- close_relocation_request: the requester closes (help received) or cancels. Pending offers are declined.
create or replace function private.close_relocation_request(p_request_id uuid, p_cancel boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.relocation_requests
  set status = case when p_cancel then 'cancelled' else 'closed' end::public.request_status,
      closed_at = now()
  where id = p_request_id and user_id = (select auth.uid()) and status = 'open';
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  update public.relocation_offers
  set status = 'declined', decided_at = now()
  where request_id = p_request_id and status = 'pending';
end;
$$;

create or replace function public.close_relocation_request(p_request_id uuid, p_cancel boolean default false)
returns void
language sql security invoker set search_path = ''
as $$
  select private.close_relocation_request(p_request_id, p_cancel);
$$;

-- rate_buddy: after closing a request, the requester rates a buddy whose offer they accepted.
create or replace function private.rate_buddy(p_request_id uuid, p_buddy_id uuid, p_rating smallint, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if not exists (
    select 1 from public.relocation_requests r
    where r.id = p_request_id and r.user_id = v_uid and r.status = 'closed'
  ) then
    raise exception 'request_not_closed' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.relocation_offers o
    where o.request_id = p_request_id and o.buddy_id = p_buddy_id and o.status = 'accepted'
  ) then
    raise exception 'offer_not_accepted' using errcode = 'P0001';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'rating_required' using errcode = '22023';
  end if;
  if char_length(v_comment) > 1000 then
    raise exception 'comment_too_long' using errcode = '22023';
  end if;

  begin
    insert into public.buddy_ratings (request_id, buddy_id, rater_id, rating, comment)
    values (p_request_id, p_buddy_id, v_uid, p_rating, v_comment);
  exception when unique_violation then
    raise exception 'already_rated' using errcode = 'P0001';
  end;
end;
$$;

create or replace function public.rate_buddy(p_request_id uuid, p_buddy_id uuid, p_rating smallint, p_comment text default null)
returns void
language sql security invoker set search_path = ''
as $$
  select private.rate_buddy(p_request_id, p_buddy_id, p_rating, p_comment);
$$;

-- request_buddy_verification: after a rejection, the buddy asks for review again.
create or replace function private.request_buddy_verification(p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not exists (
    select 1 from public.buddy_profiles b where b.user_id = v_uid and b.verification_status = 'rejected'
  ) then
    raise exception 'not_rejected' using errcode = 'P0001';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;

  insert into public.verification_requests (user_id, kind, applicant_note) values (v_uid, 'buddy', v_note);
  update public.buddy_profiles set verification_status = 'pending', verified_at = null where user_id = v_uid;
end;
$$;

create or replace function public.request_buddy_verification(p_note text default null)
returns void
language sql security invoker set search_path = ''
as $$
  select private.request_buddy_verification(p_note);
$$;

-- admin_review_verification: now also updates the buddy profile for 'buddy' requests.
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
  end if;

  perform public.log_admin_action(
    case when p_approve then 'verification_approved' else 'verification_rejected' end,
    'verification_requests', p_request_id,
    jsonb_build_object('kind', v_req.kind, 'subject_id', v_req.subject_id, 'user_id', v_req.user_id, 'reason', v_reason)
  );
end;
$$;

revoke execute on function
  private.is_eligible_buddy_for(uuid, uuid, boolean), private.is_my_relocation_request(uuid),
  private.has_offered_on_request(uuid), private.can_view_buddy(uuid),
  private.offer_help(uuid, text), private.respond_to_offer(uuid, boolean), private.withdraw_offer(uuid),
  private.close_relocation_request(uuid, boolean), private.rate_buddy(uuid, uuid, smallint, text),
  private.request_buddy_verification(text)
  from public, anon, authenticated;
revoke execute on function
  public.offer_help(uuid, text), public.respond_to_offer(uuid, boolean), public.withdraw_offer(uuid),
  public.close_relocation_request(uuid, boolean), public.rate_buddy(uuid, uuid, smallint, text),
  public.request_buddy_verification(text)
  from public, anon;
grant execute on function
  private.is_eligible_buddy_for(uuid, uuid, boolean), private.is_my_relocation_request(uuid),
  private.has_offered_on_request(uuid), private.can_view_buddy(uuid),
  private.offer_help(uuid, text), private.respond_to_offer(uuid, boolean), private.withdraw_offer(uuid),
  private.close_relocation_request(uuid, boolean), private.rate_buddy(uuid, uuid, smallint, text),
  private.request_buddy_verification(text)
  to authenticated;
grant execute on function
  public.offer_help(uuid, text), public.respond_to_offer(uuid, boolean), public.withdraw_offer(uuid),
  public.close_relocation_request(uuid, boolean), public.rate_buddy(uuid, uuid, smallint, text),
  public.request_buddy_verification(text)
  to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.buddy_profiles enable row level security;
alter table public.relocation_requests enable row level security;
alter table public.relocation_offers enable row level security;
alter table public.buddy_ratings enable row level security;

revoke all on public.buddy_profiles, public.relocation_requests, public.relocation_offers, public.buddy_ratings
  from anon, authenticated;

-- buddy_profiles: the buddy, admins, and requesters who may see them (see can_view_buddy).
-- Verification and rating columns are not writable by API roles.
grant select on public.buddy_profiles to authenticated;
grant insert (user_id, city_id, neighbourhood_ids, bio, languages, help_types, is_active)
  on public.buddy_profiles to authenticated;
grant update (city_id, neighbourhood_ids, bio, languages, help_types, is_active)
  on public.buddy_profiles to authenticated;

create policy buddy_profiles_select on public.buddy_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()) or private.can_view_buddy(user_id));
create policy buddy_profiles_insert on public.buddy_profiles
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.onboarding_completed_at is not null and p.suspended_at is null
    )
  );
create policy buddy_profiles_update on public.buddy_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- relocation_requests: the owner; verified buddies in the same city while the request is open
-- (gender rule and blocks enforced here, not only in the UI); buddies who already offered; admins.
grant select, delete on public.relocation_requests to authenticated;
grant insert (user_id, city_id, neighbourhood_ids, move_from, move_to, workplace_location, workplace_address,
  budget_min, budget_max, household, needs, note, same_gender_buddies_only) on public.relocation_requests to authenticated;
grant update (city_id, neighbourhood_ids, move_from, move_to, workplace_location, workplace_address,
  budget_min, budget_max, household, needs, note, same_gender_buddies_only) on public.relocation_requests to authenticated;

create policy relocation_requests_select on public.relocation_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or (status = 'open' and hidden_at is null
        and private.is_eligible_buddy_for(city_id, user_id, same_gender_buddies_only))
    or private.has_offered_on_request(id)
  );
create policy relocation_requests_insert on public.relocation_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy relocation_requests_update on public.relocation_requests
  for update to authenticated
  using (user_id = (select auth.uid()) and status = 'open')
  with check (user_id = (select auth.uid()));
-- Only a request nobody offered on can be deleted; otherwise it is cancelled.
create policy relocation_requests_delete on public.relocation_requests
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and not exists (select 1 from public.relocation_offers o where o.request_id = relocation_requests.id)
  );

-- relocation_offers: read-only for API roles. The buddy sees their offers; the requester sees offers on their requests.
grant select on public.relocation_offers to authenticated;

create policy relocation_offers_select on public.relocation_offers
  for select to authenticated
  using (
    buddy_id = (select auth.uid())
    or private.is_my_relocation_request(request_id)
    or (select public.is_admin())
  );

-- buddy_ratings: written only by rate_buddy(). The rater, the buddy and admins read them.
grant select on public.buddy_ratings to authenticated;

create policy buddy_ratings_select on public.buddy_ratings
  for select to authenticated
  using (
    rater_id = (select auth.uid())
    or (buddy_id = (select auth.uid()) and hidden_at is null)
    or (select public.is_admin())
  );
