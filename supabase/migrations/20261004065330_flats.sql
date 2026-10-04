-- Phase 4 / M015 flats & rooms (PRODUCT_SPEC §7.3, D-004, D-018, D-019).
-- The exact address and point live in flat_listing_private, readable only by the lister, admins and users
-- whose contact request the lister accepted. The public listing carries an approximate point.
-- Listing status, expiry and soft delete change only through RPCs (D-015).

create type public.listing_type as enum ('entire_flat', 'private_room', 'shared_room', 'pg_hostel');
create type public.listing_status as enum ('active', 'paused', 'rented', 'expired');
create type public.tenant_gender_pref as enum ('any', 'male', 'female', 'family');
create type public.furnishing as enum ('unfurnished', 'semi', 'full');
create type public.food_pref as enum ('veg_only', 'non_veg_ok', 'halal_only');

create table public.flat_listings (
  id uuid primary key default gen_random_uuid(),
  lister_id uuid not null references public.profiles (id) on delete cascade,
  listing_type public.listing_type not null,
  city_id uuid not null references public.cities (id) on delete restrict,
  neighbourhood_id uuid references public.neighbourhoods (id) on delete set null,
  title text not null check (char_length(title) between 5 and 120),
  description text check (char_length(description) <= 4000),
  -- Monthly rent and deposit in paise.
  rent integer not null check (rent > 0),
  deposit integer check (deposit >= 0),
  currency char(3) not null default 'INR',
  furnishing public.furnishing not null default 'unfurnished',
  available_from date not null,
  min_stay_months smallint check (min_stay_months between 0 and 36),
  bedrooms smallint check (bedrooms between 0 and 20),
  bathrooms smallint check (bathrooms between 0 and 20),
  amenities text[] not null default '{}' check (cardinality(amenities) <= 30),
  food_pref public.food_pref,
  tenant_gender_pref public.tenant_gender_pref not null default 'any',
  -- Approximate public point (D-018). Written only by the trigger on flat_listing_private.
  approx_location extensions.geography(point, 4326),
  -- A new listing starts paused; the lister publishes it (set_listing_status) once the address is saved.
  status public.listing_status not null default 'paused',
  expires_at timestamptz not null default (now() + interval '30 days'),
  renewed_at timestamptz,
  deleted_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flat_listings_lister_id_idx on public.flat_listings (lister_id);
create index flat_listings_search_idx on public.flat_listings (city_id, status, rent);
create index flat_listings_neighbourhood_id_idx on public.flat_listings (neighbourhood_id);
create index flat_listings_approx_location_gix on public.flat_listings using gist (approx_location);
create index flat_listings_expiry_idx on public.flat_listings (expires_at) where status = 'active';

create trigger flat_listings_set_updated_at
  before update on public.flat_listings
  for each row execute function public.set_updated_at();

-- Exact address and point. Restricted (see policies below).
create table public.flat_listing_private (
  listing_id uuid primary key references public.flat_listings (id) on delete cascade,
  address_line text not null check (char_length(address_line) between 5 and 300),
  landmark text check (char_length(landmark) <= 200),
  exact_location extensions.geography(point, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger flat_listing_private_set_updated_at
  before update on public.flat_listing_private
  for each row execute function public.set_updated_at();

create table public.flat_listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.flat_listings (id) on delete cascade,
  -- Path in the public listing-photos bucket: '{listing_id}/{uuid}.{ext}'.
  storage_path text not null check (char_length(storage_path) <= 300),
  position smallint not null default 0 check (position between 0 and 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, storage_path)
);

create trigger flat_listing_photos_set_updated_at
  before update on public.flat_listing_photos
  for each row execute function public.set_updated_at();

create table public.flat_contact_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.flat_listings (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  intro text not null check (char_length(intro) between 1 and 1000),
  status public.offer_status not null default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flat_contact_requests_listing_idx on public.flat_contact_requests (listing_id, status);
create index flat_contact_requests_requester_idx on public.flat_contact_requests (requester_id, created_at desc);
-- One live request per user per listing.
create unique index flat_contact_requests_one_live_idx
  on public.flat_contact_requests (listing_id, requester_id)
  where status in ('pending', 'accepted');

create trigger flat_contact_requests_set_updated_at
  before update on public.flat_contact_requests
  for each row execute function public.set_updated_at();

-- Helpers (definer, so policies do not recurse through each other's RLS) ----------

create or replace function private.is_my_listing(p_listing_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.flat_listings l
    where l.id = p_listing_id and l.lister_id = (select auth.uid())
  );
$$;

-- Storage folder name -> listing ownership, tolerant of malformed paths.
create or replace function private.is_my_listing_path(p_folder text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.is_my_listing(p_folder::uuid)
    else false
  end;
$$;

-- Gender preference and blocks, enforced in RLS: a male-only or female-only listing is invisible to the
-- other gender; 'any' and 'family' listings are open to everyone. Suspended listers are hidden.
create or replace function private.listing_open_to_me(p_lister_id uuid, p_pref public.tenant_gender_pref)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles lister on lister.id = p_lister_id
    where me.id = (select auth.uid())
      and me.suspended_at is null
      and lister.suspended_at is null
      and (p_pref in ('any', 'family') or (me.gender is not null and me.gender::text = p_pref::text))
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = me.id and b.blocked_id = p_lister_id)
           or (b.blocker_id = p_lister_id and b.blocked_id = me.id)
      )
  );
$$;

create or replace function private.has_contact_request(p_listing_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.flat_contact_requests r
    where r.listing_id = p_listing_id and r.requester_id = (select auth.uid())
      and r.status in ('pending', 'accepted')
  );
$$;

-- The gate for the exact address: the lister accepted this user's contact request (and no block since).
create or replace function private.has_accepted_contact(p_listing_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.flat_contact_requests r
    join public.flat_listings l on l.id = r.listing_id
    where r.listing_id = p_listing_id
      and r.requester_id = (select auth.uid())
      and r.status = 'accepted'
      and not private.is_blocked_between((select auth.uid()), l.lister_id)
  );
$$;

-- Listing rules on insert: finished onboarding (phone verified), at most 10 live listings, 10 new a day.
-- Adds the flat_lister role.
create or replace function public.flat_listings_before_insert()
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
    where p.id = new.lister_id and p.onboarding_completed_at is not null and p.suspended_at is null
  ) then
    raise exception 'onboarding_required' using errcode = 'P0001';
  end if;
  if (select count(*) from public.flat_listings l
      where l.lister_id = new.lister_id and l.deleted_at is null and l.status in ('active', 'paused')) >= 10 then
    raise exception 'listing_limit_reached' using errcode = 'P0001';
  end if;
  perform public.check_rate_limit('flat_listing', 10, interval '1 day');

  insert into public.user_roles (user_id, role) values (new.lister_id, 'flat_lister')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

revoke execute on function public.flat_listings_before_insert() from public, anon, authenticated;

create trigger flat_listings_before_insert
  before insert on public.flat_listings
  for each row execute function public.flat_listings_before_insert();

-- D-018: the public point is the exact point snapped to a ~400 m grid, then moved 50–200 m in a direction
-- fixed by a hash of the listing id. It is stable per listing (reads cannot be averaged) and stays
-- within ~500 m of the real location.
create or replace function public.flat_listing_private_sync_approx()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_geom extensions.geometry := new.exact_location::extensions.geometry;
  v_lat_step double precision := 400.0 / 111320.0;
  v_lat double precision;
  v_lng_step double precision;
  v_lng double precision;
  v_distance double precision;
  v_bearing double precision;
begin
  v_lat := round(extensions.st_y(v_geom) / v_lat_step) * v_lat_step;
  v_lng_step := 400.0 / (111320.0 * greatest(cos(radians(v_lat)), 0.01));
  v_lng := round(extensions.st_x(v_geom) / v_lng_step) * v_lng_step;
  v_distance := 50 + (abs(hashtextextended(new.listing_id::text, 1)) % 151);
  v_bearing := radians(abs(hashtextextended(new.listing_id::text, 2)) % 360);

  update public.flat_listings
  set approx_location = extensions.st_project(
        extensions.st_point(v_lng, v_lat, 4326)::extensions.geography, v_distance, v_bearing)
  where id = new.listing_id;
  return null;
end;
$$;

revoke execute on function public.flat_listing_private_sync_approx() from public, anon, authenticated;

create trigger flat_listing_private_sync_approx
  after insert or update of exact_location on public.flat_listing_private
  for each row execute function public.flat_listing_private_sync_approx();

-- Photos: at most 10 per listing, stored under the listing's own folder.
create or replace function public.flat_listing_photos_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.is_my_listing(new.listing_id) then
    raise exception 'not_lister' using errcode = '42501';
  end if;
  if new.storage_path !~ ('^' || new.listing_id::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'invalid_photo_path' using errcode = '22023';
  end if;
  perform 1 from public.flat_listings l where l.id = new.listing_id for update;
  if (select count(*) from public.flat_listing_photos p where p.listing_id = new.listing_id) >= 10 then
    raise exception 'photo_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.flat_listing_photos_before_insert() from public, anon, authenticated;

create trigger flat_listing_photos_before_insert
  before insert on public.flat_listing_photos
  for each row execute function public.flat_listing_photos_before_insert();

-- RPCs ---------------------------------------------------------------------------

-- save_listing_address: the lister sets the exact address and point (RLS applies: invoker).
create or replace function public.save_listing_address(
  p_listing_id uuid,
  p_address_line text,
  p_landmark text,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_location' using errcode = '22023';
  end if;
  insert into public.flat_listing_private (listing_id, address_line, landmark, exact_location)
  values (p_listing_id, btrim(p_address_line), nullif(btrim(coalesce(p_landmark, '')), ''),
          extensions.st_point(p_lng, p_lat, 4326)::extensions.geography)
  on conflict (listing_id) do update
  set address_line = excluded.address_line,
      landmark = excluded.landmark,
      exact_location = excluded.exact_location;
end;
$$;

-- get_listing_address: exact address and coordinates, for the lister and for users with an accepted
-- contact request. RLS on flat_listing_private decides (invoker); everyone else gets no row.
create or replace function public.get_listing_address(p_listing_id uuid)
returns table (address_line text, landmark text, lat double precision, lng double precision)
language sql stable security invoker set search_path = ''
as $$
  select p.address_line, p.landmark,
         extensions.st_y(p.exact_location::extensions.geometry),
         extensions.st_x(p.exact_location::extensions.geometry)
  from public.flat_listing_private p
  where p.listing_id = p_listing_id;
$$;

-- search_flats: list search over listings the caller may see (RLS applies: invoker).
-- Returns the approximate point only. Map and radius filters arrive with the maps module.
create or replace function public.search_flats(
  p_city_id uuid default null,
  p_neighbourhood_id uuid default null,
  p_rent_min integer default null,
  p_rent_max integer default null,
  p_listing_types public.listing_type[] default null,
  p_furnishing public.furnishing default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  lister_id uuid,
  listing_type public.listing_type,
  city_id uuid,
  neighbourhood_id uuid,
  title text,
  rent integer,
  deposit integer,
  currency text,
  furnishing public.furnishing,
  available_from date,
  bedrooms smallint,
  bathrooms smallint,
  tenant_gender_pref public.tenant_gender_pref,
  food_pref public.food_pref,
  approx_lat double precision,
  approx_lng double precision,
  cover_photo_path text,
  created_at timestamptz,
  total_count bigint
)
language sql stable security invoker set search_path = ''
as $$
  select
    l.id, l.lister_id, l.listing_type, l.city_id, l.neighbourhood_id, l.title, l.rent, l.deposit,
    l.currency::text, l.furnishing, l.available_from, l.bedrooms, l.bathrooms, l.tenant_gender_pref, l.food_pref,
    extensions.st_y(l.approx_location::extensions.geometry),
    extensions.st_x(l.approx_location::extensions.geometry),
    (select ph.storage_path from public.flat_listing_photos ph
     where ph.listing_id = l.id order by ph.position, ph.created_at limit 1),
    l.created_at,
    count(*) over ()
  from public.flat_listings l
  where l.status = 'active'
    and l.deleted_at is null
    and l.hidden_at is null
    and l.expires_at > now()
    and l.lister_id <> (select auth.uid())
    and (p_city_id is null or l.city_id = p_city_id)
    and (p_neighbourhood_id is null or l.neighbourhood_id = p_neighbourhood_id)
    and (p_rent_min is null or l.rent >= p_rent_min)
    and (p_rent_max is null or l.rent <= p_rent_max)
    and (p_listing_types is null or l.listing_type = any (p_listing_types))
    and (p_furnishing is null or l.furnishing = p_furnishing)
  order by l.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- set_listing_status: the lister pauses, re-activates or marks a listing as rented.
create or replace function private.set_listing_status(p_listing_id uuid, p_status public.listing_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.flat_listings;
begin
  select * into v_listing from public.flat_listings l
  where l.id = p_listing_id and l.lister_id = (select auth.uid()) and l.deleted_at is null
  for update;
  if not found then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;
  if p_status is null or p_status = 'expired' then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  if p_status = 'active' and v_listing.expires_at <= now() then
    raise exception 'listing_expired' using errcode = 'P0001';
  end if;
  if p_status = 'active' and not exists (
    select 1 from public.flat_listing_private p where p.listing_id = p_listing_id
  ) then
    raise exception 'address_required' using errcode = 'P0001';
  end if;
  update public.flat_listings set status = p_status where id = p_listing_id;
end;
$$;

create or replace function public.set_listing_status(p_listing_id uuid, p_status public.listing_status)
returns void
language sql security invoker set search_path = ''
as $$
  select private.set_listing_status(p_listing_id, p_status);
$$;

-- renew_listing: another 30 days from now, and active again.
create or replace function private.renew_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.flat_listings
  set status = 'active', expires_at = now() + interval '30 days', renewed_at = now()
  where id = p_listing_id and lister_id = (select auth.uid()) and deleted_at is null and status <> 'rented';
  if not found then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.renew_listing(p_listing_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.renew_listing(p_listing_id);
$$;

-- delete_listing: soft delete (kept for moderation history). Live contact requests are declined.
create or replace function private.delete_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.flat_listings
  set deleted_at = now(), status = 'paused'
  where id = p_listing_id and lister_id = (select auth.uid()) and deleted_at is null;
  if not found then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;
  update public.flat_contact_requests
  set status = 'declined', decided_at = now()
  where listing_id = p_listing_id and status = 'pending';
end;
$$;

create or replace function public.delete_listing(p_listing_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.delete_listing(p_listing_id);
$$;

-- send_contact_request: an interested user introduces themselves. The listing must be live and open to them.
create or replace function private.send_contact_request(p_listing_id uuid, p_intro text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_listing public.flat_listings;
  v_intro text := nullif(btrim(coalesce(p_intro, '')), '');
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
  if v_intro is null or char_length(v_intro) > 1000 then
    raise exception 'invalid_intro' using errcode = '22023';
  end if;

  select * into v_listing from public.flat_listings l where l.id = p_listing_id;
  if not found or v_listing.status <> 'active' or v_listing.deleted_at is not null
     or v_listing.hidden_at is not null or v_listing.expires_at <= now()
     or not private.listing_open_to_me(v_listing.lister_id, v_listing.tenant_gender_pref) then
    raise exception 'listing_not_available' using errcode = 'P0001';
  end if;
  if v_listing.lister_id = v_uid then
    raise exception 'own_listing' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.flat_contact_requests r
    where r.listing_id = p_listing_id and r.requester_id = v_uid and r.status in ('pending', 'accepted')
  ) then
    raise exception 'already_requested' using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('contact_request', 10, interval '1 day');

  begin
    insert into public.flat_contact_requests (listing_id, requester_id, intro)
    values (p_listing_id, v_uid, v_intro)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_requested' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

create or replace function public.send_contact_request(p_listing_id uuid, p_intro text)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.send_contact_request(p_listing_id, p_intro);
$$;

-- respond_contact_request: the lister accepts or declines. Accepting opens a conversation (returned)
-- and, through RLS on flat_listing_private, reveals the exact address to that requester only.
create or replace function private.respond_contact_request(p_request_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request public.flat_contact_requests;
begin
  select * into v_request from public.flat_contact_requests r where r.id = p_request_id for update;
  if v_request.id is null or not private.is_my_listing(v_request.listing_id) then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'request_already_decided' using errcode = 'P0001';
  end if;

  if not p_accept then
    update public.flat_contact_requests set status = 'declined', decided_at = now() where id = p_request_id;
    return null;
  end if;

  if private.is_blocked_between(v_uid, v_request.requester_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  update public.flat_contact_requests set status = 'accepted', decided_at = now() where id = p_request_id;
  return private.open_conversation('flat_contact', p_request_id, v_request.requester_id, v_uid);
end;
$$;

create or replace function public.respond_contact_request(p_request_id uuid, p_accept boolean)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.respond_contact_request(p_request_id, p_accept);
$$;

-- withdraw_contact_request: the requester takes back a pending or accepted request (and loses address access).
create or replace function private.withdraw_contact_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.flat_contact_requests
  set status = 'withdrawn', decided_at = now()
  where id = p_request_id and requester_id = (select auth.uid()) and status in ('pending', 'accepted');
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.withdraw_contact_request(p_request_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.withdraw_contact_request(p_request_id);
$$;

revoke execute on function
  private.is_my_listing(uuid), private.is_my_listing_path(text),
  private.listing_open_to_me(uuid, public.tenant_gender_pref),
  private.has_contact_request(uuid), private.has_accepted_contact(uuid),
  private.set_listing_status(uuid, public.listing_status), private.renew_listing(uuid), private.delete_listing(uuid),
  private.send_contact_request(uuid, text), private.respond_contact_request(uuid, boolean),
  private.withdraw_contact_request(uuid)
  from public, anon, authenticated;
revoke execute on function
  public.save_listing_address(uuid, text, text, double precision, double precision),
  public.get_listing_address(uuid),
  public.search_flats(uuid, uuid, integer, integer, public.listing_type[], public.furnishing, integer, integer),
  public.set_listing_status(uuid, public.listing_status), public.renew_listing(uuid), public.delete_listing(uuid),
  public.send_contact_request(uuid, text), public.respond_contact_request(uuid, boolean),
  public.withdraw_contact_request(uuid)
  from public, anon;
grant execute on function
  private.is_my_listing(uuid), private.is_my_listing_path(text),
  private.listing_open_to_me(uuid, public.tenant_gender_pref),
  private.has_contact_request(uuid), private.has_accepted_contact(uuid),
  private.set_listing_status(uuid, public.listing_status), private.renew_listing(uuid), private.delete_listing(uuid),
  private.send_contact_request(uuid, text), private.respond_contact_request(uuid, boolean),
  private.withdraw_contact_request(uuid)
  to authenticated;
grant execute on function
  public.save_listing_address(uuid, text, text, double precision, double precision),
  public.get_listing_address(uuid),
  public.search_flats(uuid, uuid, integer, integer, public.listing_type[], public.furnishing, integer, integer),
  public.set_listing_status(uuid, public.listing_status), public.renew_listing(uuid), public.delete_listing(uuid),
  public.send_contact_request(uuid, text), public.respond_contact_request(uuid, boolean),
  public.withdraw_contact_request(uuid)
  to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.flat_listings enable row level security;
alter table public.flat_listing_private enable row level security;
alter table public.flat_listing_photos enable row level security;
alter table public.flat_contact_requests enable row level security;

revoke all on public.flat_listings, public.flat_listing_private, public.flat_listing_photos,
  public.flat_contact_requests from anon, authenticated;

-- flat_listings: signed-in only (D-012). Others see live listings that are open to their gender and not
-- blocked; a user with a live contact request keeps access. approx_location, status, expires_at,
-- deleted_at and hidden_at are not writable by API roles.
grant select on public.flat_listings to authenticated;
grant insert (lister_id, listing_type, city_id, neighbourhood_id, title, description, rent, deposit, furnishing,
  available_from, min_stay_months, bedrooms, bathrooms, amenities, food_pref, tenant_gender_pref)
  on public.flat_listings to authenticated;
grant update (listing_type, city_id, neighbourhood_id, title, description, rent, deposit, furnishing,
  available_from, min_stay_months, bedrooms, bathrooms, amenities, food_pref, tenant_gender_pref)
  on public.flat_listings to authenticated;

create policy flat_listings_select on public.flat_listings
  for select to authenticated
  using (
    lister_id = (select auth.uid())
    or (select public.is_admin())
    or (
      deleted_at is null and hidden_at is null
      and (
        (status = 'active' and expires_at > now())
        or private.has_contact_request(id)
      )
      and private.listing_open_to_me(lister_id, tenant_gender_pref)
    )
  );
create policy flat_listings_insert on public.flat_listings
  for insert to authenticated
  with check (lister_id = (select auth.uid()));
create policy flat_listings_update on public.flat_listings
  for update to authenticated
  using (lister_id = (select auth.uid()) and deleted_at is null)
  with check (lister_id = (select auth.uid()));

-- flat_listing_private: the lister, admins, and users whose contact request was ACCEPTED. Nobody else.
grant select on public.flat_listing_private to authenticated;
grant insert (listing_id, address_line, landmark, exact_location),
  update (address_line, landmark, exact_location) on public.flat_listing_private to authenticated;

create policy flat_listing_private_select on public.flat_listing_private
  for select to authenticated
  using (
    private.is_my_listing(listing_id)
    or (select public.is_admin())
    or private.has_accepted_contact(listing_id)
  );
create policy flat_listing_private_insert on public.flat_listing_private
  for insert to authenticated
  with check (private.is_my_listing(listing_id));
create policy flat_listing_private_update on public.flat_listing_private
  for update to authenticated
  using (private.is_my_listing(listing_id))
  with check (private.is_my_listing(listing_id));

-- flat_listing_photos: visible whenever the parent listing is visible (its RLS applies in the subquery).
grant select, delete on public.flat_listing_photos to authenticated;
grant insert (listing_id, storage_path, position), update (position) on public.flat_listing_photos to authenticated;

create policy flat_listing_photos_select on public.flat_listing_photos
  for select to authenticated
  using (exists (select 1 from public.flat_listings l where l.id = flat_listing_photos.listing_id));
create policy flat_listing_photos_insert on public.flat_listing_photos
  for insert to authenticated
  with check (private.is_my_listing(listing_id));
create policy flat_listing_photos_update on public.flat_listing_photos
  for update to authenticated
  using (private.is_my_listing(listing_id))
  with check (private.is_my_listing(listing_id));
create policy flat_listing_photos_delete on public.flat_listing_photos
  for delete to authenticated
  using (private.is_my_listing(listing_id));

-- flat_contact_requests: read-only for API roles. The requester and the lister see a request.
grant select on public.flat_contact_requests to authenticated;

create policy flat_contact_requests_select on public.flat_contact_requests
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or private.is_my_listing(listing_id)
    or (select public.is_admin())
  );

-- Storage: public "listing-photos" bucket, '{listing_id}/{uuid}.{ext}' (D-019). Read through the public URL
-- (no select policy, so no listing of files). EXIF is stripped in the browser before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy listing_photos_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos' and private.is_my_listing_path((storage.foldername(name))[1]));

create policy listing_photos_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-photos' and private.is_my_listing_path((storage.foldername(name))[1]));

-- 30-day expiry: every hour, active listings past expires_at become 'expired' (RLS already hides them).
select cron.schedule(
  'expire-flat-listings',
  '5 * * * *',
  $$update public.flat_listings set status = 'expired' where status = 'active' and expires_at <= now()$$
);
