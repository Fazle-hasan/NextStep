-- Phase 5 geo search (PRODUCT_SPEC §8.3): map and "near a masjid and my workplace" RPCs.
-- All are SECURITY INVOKER, so RLS still applies: places are limited to verified ones, flats to listings the
-- caller may see (gender preference, blocks, live status). Flats are located by their APPROXIMATE point only
-- (D-004, D-018): distances are accurate to about 500 m and the exact point is never read here.

-- places_in_view: verified places inside a map viewport. Public.
create or replace function public.places_in_view(
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_types public.place_type[] default null,
  p_limit integer default 300
)
returns table (
  id uuid,
  name text,
  place_type public.place_type,
  address text,
  city_id uuid,
  neighbourhood_id uuid,
  lat double precision,
  lng double precision
)
language sql stable security invoker set search_path = ''
as $$
  select p.id, p.name, p.place_type, p.address, p.city_id, p.neighbourhood_id,
         extensions.st_y(p.location::extensions.geometry), extensions.st_x(p.location::extensions.geometry)
  from public.places p
  where p.is_verified and p.hidden_at is null
    and extensions.st_intersects(
      p.location,
      extensions.st_makeenvelope(
        greatest(p_min_lng, -180), greatest(p_min_lat, -90), least(p_max_lng, 180), least(p_max_lat, 90), 4326
      )::extensions.geography
    )
    and (p_types is null or p.place_type = any (p_types))
  order by p.place_type, p.name
  limit least(greatest(coalesce(p_limit, 300), 1), 500);
$$;

-- nearby_places: verified places within a radius of a point, nearest first. Public.
create or replace function public.nearby_places(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 3,
  p_types public.place_type[] default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  name text,
  place_type public.place_type,
  address text,
  timings text,
  lat double precision,
  lng double precision,
  distance_m double precision
)
language sql stable security invoker set search_path = ''
as $$
  with q as (
    select extensions.st_point(p_lng, p_lat, 4326)::extensions.geography as pt,
           least(greatest(coalesce(p_radius_km, 3), 0.1), 50) * 1000.0 as radius_m
  )
  select p.id, p.name, p.place_type, p.address, p.timings,
         extensions.st_y(p.location::extensions.geometry), extensions.st_x(p.location::extensions.geometry),
         round(extensions.st_distance(p.location, q.pt))::double precision
  from public.places p
  cross join q
  where p.is_verified and p.hidden_at is null
    and p_lat between -90 and 90 and p_lng between -180 and 180
    and extensions.st_dwithin(p.location, q.pt, q.radius_m)
    and (p_types is null or p.place_type = any (p_types))
  order by extensions.st_distance(p.location, q.pt)
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

-- search_flats_near: the key filter. Flats within p_masjid_radius_km of a verified Shia masjid or imambargah
-- AND within p_workplace_radius_km of the workplace point (each filter is optional), plus the usual filters
-- and an optional map viewport. Returns the distance to the nearest masjid/imambargah and to the workplace.
create or replace function public.search_flats_near(
  p_city_id uuid default null,
  p_masjid_radius_km double precision default null,
  p_workplace_lat double precision default null,
  p_workplace_lng double precision default null,
  p_workplace_radius_km double precision default null,
  p_rent_min integer default null,
  p_rent_max integer default null,
  p_listing_types public.listing_type[] default null,
  p_min_lng double precision default null,
  p_min_lat double precision default null,
  p_max_lng double precision default null,
  p_max_lat double precision default null,
  p_limit integer default 50,
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
  tenant_gender_pref public.tenant_gender_pref,
  approx_lat double precision,
  approx_lng double precision,
  cover_photo_path text,
  nearest_masjid_id uuid,
  nearest_masjid_name text,
  nearest_masjid_type public.place_type,
  nearest_masjid_distance_m double precision,
  workplace_distance_m double precision,
  total_count bigint
)
language sql stable security invoker set search_path = ''
as $$
  with q as (
    select
      case when p_workplace_lat between -90 and 90 and p_workplace_lng between -180 and 180
        then extensions.st_point(p_workplace_lng, p_workplace_lat, 4326)::extensions.geography end as work_pt,
      case when p_masjid_radius_km is not null
        then least(greatest(p_masjid_radius_km, 0.1), 50) * 1000.0 end as masjid_m,
      case when p_workplace_radius_km is not null
        then least(greatest(p_workplace_radius_km, 0.1), 100) * 1000.0 end as work_m,
      case when p_min_lng is not null and p_min_lat is not null and p_max_lng is not null and p_max_lat is not null
        then extensions.st_makeenvelope(
          greatest(p_min_lng, -180), greatest(p_min_lat, -90), least(p_max_lng, 180), least(p_max_lat, 90), 4326
        )::extensions.geography end as bbox
  )
  select
    l.id, l.lister_id, l.listing_type, l.city_id, l.neighbourhood_id, l.title, l.rent, l.deposit,
    l.currency::text, l.furnishing, l.available_from, l.bedrooms, l.tenant_gender_pref,
    extensions.st_y(l.approx_location::extensions.geometry),
    extensions.st_x(l.approx_location::extensions.geometry),
    (select ph.storage_path from public.flat_listing_photos ph
     where ph.listing_id = l.id order by ph.position, ph.created_at limit 1),
    m.id, m.name, m.place_type, m.distance_m,
    case when q.work_pt is not null
      then round(extensions.st_distance(l.approx_location, q.work_pt))::double precision end,
    count(*) over ()
  from public.flat_listings l
  cross join q
  left join lateral (
    select p.id, p.name, p.place_type,
           round(extensions.st_distance(p.location, l.approx_location))::double precision as distance_m
    from public.places p
    where p.is_verified and p.hidden_at is null
      and p.place_type in ('shia_masjid', 'imambargah')
      and extensions.st_dwithin(p.location, l.approx_location, coalesce(q.masjid_m, 50000))
    order by extensions.st_distance(p.location, l.approx_location)
    limit 1
  ) m on true
  where l.status = 'active'
    and l.deleted_at is null
    and l.hidden_at is null
    and l.expires_at > now()
    and l.approx_location is not null
    and l.lister_id <> (select auth.uid())
    and (p_city_id is null or l.city_id = p_city_id)
    and (p_rent_min is null or l.rent >= p_rent_min)
    and (p_rent_max is null or l.rent <= p_rent_max)
    and (p_listing_types is null or l.listing_type = any (p_listing_types))
    and (q.masjid_m is null or m.id is not null)
    and (q.work_m is null or q.work_pt is null or extensions.st_dwithin(l.approx_location, q.work_pt, q.work_m))
    and (q.bbox is null or extensions.st_intersects(l.approx_location, q.bbox))
  order by
    case when q.work_pt is not null then extensions.st_distance(l.approx_location, q.work_pt) end asc nulls last,
    m.distance_m asc nulls last,
    l.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function
  public.places_in_view(double precision, double precision, double precision, double precision, public.place_type[], integer),
  public.nearby_places(double precision, double precision, double precision, public.place_type[], integer),
  public.search_flats_near(uuid, double precision, double precision, double precision, double precision, integer, integer,
    public.listing_type[], double precision, double precision, double precision, double precision, integer, integer)
  from public, anon;
grant execute on function
  public.places_in_view(double precision, double precision, double precision, double precision, public.place_type[], integer),
  public.nearby_places(double precision, double precision, double precision, public.place_type[], integer)
  to anon, authenticated;
-- Flats need sign-in (D-012).
grant execute on function
  public.search_flats_near(uuid, double precision, double precision, double precision, double precision, integer, integer,
    public.listing_type[], double precision, double precision, double precision, double precision, integer, integer)
  to authenticated;
