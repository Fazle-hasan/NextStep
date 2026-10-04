-- Sample data for Places and area guides: about 6 places around every seeded neighbourhood (a Shia masjid or
-- imambargah plus everyday places), a published guide for each neighbourhood in Mumbai and Bengaluru, and a few
-- community tips. Everything is clearly fake (CLAUDE.md §3): names start with "Sample", coordinates are simple
-- offsets from the neighbourhood centre, and timings are made up. Real, admin-verified places replace these later.
-- Safe to run more than once. To remove it, run remove_sample_data.sql.txt from this folder.
-- Tips need the sample buddies from 02_sample_settle_in.sql (they are skipped if those are missing).

-- Sample places ---------------------------------------------------------------------------
-- Ids are derived from the neighbourhood and the kind, so re-running does not duplicate rows.
insert into public.places (id, name, place_type, address, location, city_id, neighbourhood_id, timings, notes, is_verified)
select
  md5('sample-place:' || c.slug || ':' || n.slug || ':' || k.key)::uuid,
  'Sample ' || k.label || ', ' || n.name,
  k.place_type::public.place_type,
  'Sample address, ' || n.name || ', ' || c.name,
  extensions.st_project(n.center, k.distance_m, radians(k.bearing_deg)),
  c.id,
  n.id,
  k.timings,
  'Sample entry for testing. Not a real place.',
  true
from public.neighbourhoods n
join public.cities c on c.id = n.city_id
cross join (values
  ('imambargah', 'Imambargah', 'imambargah', 350, 40, 'Majlis every Thursday after Maghrib. Open daily for prayers.'),
  ('masjid', 'Shia Masjid', 'shia_masjid', 900, 200, 'Five daily prayers. Jumah at 1:15 pm.'),
  ('restaurant', 'Halal Kitchen', 'halal_restaurant', 250, 120, 'Open 11 am to 11 pm.'),
  ('grocery', 'Halal Grocery', 'halal_grocery', 450, 280, 'Open 8 am to 10 pm.'),
  ('clinic', 'Family Clinic', 'hospital_clinic', 700, 330, 'Open 9 am to 9 pm. Closed on Sundays.'),
  ('station', 'Station', 'transit_station', 1100, 160, null)
) as k (key, label, place_type, distance_m, bearing_deg, timings)
where n.center is not null
on conflict (id) do nothing;

-- A community centre in each city centre.
insert into public.places (id, name, place_type, address, location, city_id, timings, notes, is_verified)
select md5('sample-place:' || c.slug || ':community-centre')::uuid,
  'Sample Community Centre, ' || c.name, 'community_center', 'Sample address, ' || c.name,
  extensions.st_project(c.center, 600, radians(75)), c.id,
  'Open 10 am to 8 pm. Youth programmes on weekends.', 'Sample entry for testing. Not a real place.', true
from public.cities c
on conflict (id) do nothing;

-- Sample area guides (published) ---------------------------------------------------------------
-- Rent ranges are monthly, in paise.
insert into public.area_guides (neighbourhood_id, summary, rent_ranges, commute_notes, safety_notes, halal_food_notes, is_published)
select n.id,
  'Sample guide. ' || n.name || ' is a well-connected part of ' || c.name
    || ' with a settled community, an imambargah within walking distance and everyday shops close by.',
  jsonb_build_object(
    'shared_room', jsonb_build_object('min', 600000, 'max', 900000),
    'private_room', jsonb_build_object('min', 1000000, 'max', 1800000),
    'entire_flat', jsonb_build_object('min', 1800000, 'max', 4000000),
    'pg_hostel', jsonb_build_object('min', 800000, 'max', 1400000)
  ),
  'Sample note. About 30 to 45 minutes to the main business districts by train or metro at peak hours.',
  'Sample note. Busy streets until late; well lit around the station and the main market.',
  'Sample note. Several halal restaurants and a halal grocery within a 10 minute walk.',
  true
from public.neighbourhoods n
join public.cities c on c.id = n.city_id
where c.slug in ('mumbai', 'bengaluru')
on conflict (neighbourhood_id) do nothing;

-- Sample community tips (by the sample buddies) ---------------------------------------------------
insert into public.area_tips (id, neighbourhood_id, author_id, body)
select md5('sample-tip:' || t.key)::uuid, n.id, t.author::uuid, t.body
from (values
  ('kurla-1', 'mumbai', 'kurla', '00000000-0000-4000-a000-000000000011',
   'Sample tip. The lanes behind the station are quieter and rents are a little lower than on the main road.'),
  ('kurla-2', 'mumbai', 'kurla', '00000000-0000-4000-a000-000000000011',
   'Sample tip. Ask at the imambargah office about rooms; families there often know of flats before they are listed.'),
  ('byculla-1', 'mumbai', 'byculla', '00000000-0000-4000-a000-000000000011',
   'Sample tip. Majlis timings change in Muharram, so check the notice board at the imambargah.'),
  ('frazer-town-1', 'bengaluru', 'frazer-town', '00000000-0000-4000-a000-000000000012',
   'Sample tip. Plenty of halal food on the main road, and buses to the tech parks start early.'),
  ('koramangala-1', 'bengaluru', 'koramangala', '00000000-0000-4000-a000-000000000012',
   'Sample tip. Traffic is heavy after 6 pm, so look for a flat on the same side as your office.')
) as t (key, city, area, author, body)
join public.cities c on c.slug = t.city
join public.neighbourhoods n on n.city_id = c.id and n.slug = t.area
where exists (select 1 from public.profiles p where p.id = t.author::uuid)
on conflict (id) do nothing;
