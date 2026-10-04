-- Sample data for Settle In: 6 fake members, 2 verified Settle-In Buddies, 7 flat listings and 4 flatmate
-- profiles in Mumbai and Bengaluru. Everything is clearly fake (CLAUDE.md §3): example.test emails,
-- +91000000xxxx phone numbers, names and titles marked "Sample", and "exact" addresses that are just the
-- neighbourhood centre. Nobody can sign in as these members (their inboxes do not exist).
-- Safe to run more than once. To remove it, run remove_sample_data.sql.txt from this folder.

-- Sample members ------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, u.phone,
  jsonb_build_object('full_name', u.full_name), '{"provider": "email", "providers": ["email"]}'::jsonb,
  now(), now(), now(), '', '', '', ''
from (values
  ('00000000-0000-4000-a000-000000000011', 'sample.member1@example.test', '910000000111', 'Sample Buddy Hasan'),
  ('00000000-0000-4000-a000-000000000012', 'sample.member2@example.test', '910000000112', 'Sample Buddy Fatima'),
  ('00000000-0000-4000-a000-000000000013', 'sample.member3@example.test', '910000000113', 'Sample Lister Abbas'),
  ('00000000-0000-4000-a000-000000000014', 'sample.member4@example.test', '910000000114', 'Sample Lister Zehra'),
  ('00000000-0000-4000-a000-000000000015', 'sample.member5@example.test', '910000000115', 'Sample Member Ali'),
  ('00000000-0000-4000-a000-000000000016', 'sample.member6@example.test', '910000000116', 'Sample Member Sakina')
) as u (id, email, phone, full_name)
on conflict (id) do nothing;

update public.profiles p
set gender = m.gender::public.gender,
    city_id = (select id from public.cities where slug = m.city),
    onboarding_completed_at = coalesce(p.onboarding_completed_at, now())
from (values
  ('00000000-0000-4000-a000-000000000011', 'male', 'mumbai'),
  ('00000000-0000-4000-a000-000000000012', 'female', 'bengaluru'),
  ('00000000-0000-4000-a000-000000000013', 'male', 'mumbai'),
  ('00000000-0000-4000-a000-000000000014', 'female', 'bengaluru'),
  ('00000000-0000-4000-a000-000000000015', 'male', 'mumbai'),
  ('00000000-0000-4000-a000-000000000016', 'female', 'mumbai')
) as m (id, gender, city)
where p.id = m.id::uuid;

-- Sample Settle-In Buddies (verified) -------------------------------------------------------
insert into public.buddy_profiles (user_id, city_id, neighbourhood_ids, bio, languages, help_types)
select b.id::uuid, c.id,
  array(select n.id from public.neighbourhoods n where n.city_id = c.id and n.slug = any (b.areas)),
  b.bio, b.languages, b.help::public.relocation_need[]
from (values
  ('00000000-0000-4000-a000-000000000011', 'mumbai', array['kurla', 'byculla'],
   'Sample buddy. Lived in Mumbai for ten years; happy to help newcomers find a flat and the nearest imambargah.',
   array['English', 'Hindi', 'Urdu'], array['flat', 'area_guidance', 'nearby_masjid', 'halal_food']),
  ('00000000-0000-4000-a000-000000000012', 'bengaluru', array['frazer-town', 'koramangala'],
   'Sample buddy. Works in tech in Bengaluru; can guide sisters moving for work.',
   array['English', 'Urdu'], array['flat', 'flatmate', 'area_guidance', 'general_advice'])
) as b (id, city, areas, bio, languages, help)
join public.cities c on c.slug = b.city
on conflict (user_id) do nothing;

update public.verification_requests
set status = 'approved', reviewed_at = now()
where kind = 'buddy' and status = 'pending'
  and user_id in ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000012');
update public.buddy_profiles
set verification_status = 'approved', verified_at = coalesce(verified_at, now())
where user_id in ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000012');

-- Sample flat listings (live) -----------------------------------------------------------------
-- Rent and deposit are monthly, in paise (e.g. 1500000 = Rs 15,000 a month).
insert into public.flat_listings (id, lister_id, listing_type, city_id, neighbourhood_id, title, description, rent, deposit,
  furnishing, available_from, min_stay_months, bedrooms, bathrooms, amenities, food_pref, tenant_gender_pref, status)
select l.id::uuid, l.lister::uuid, l.type::public.listing_type, c.id, n.id, l.title, l.description, l.rent, l.deposit,
  l.furnishing::public.furnishing, current_date + l.in_days, l.min_stay, l.beds, l.baths, l.amenities,
  l.food::public.food_pref, l.pref::public.tenant_gender_pref, 'active'
from (values
  ('00000000-0000-4000-8f00-000000000001', '00000000-0000-4000-a000-000000000013', 'private_room', 'mumbai', 'kurla',
   'Sample: private room in a 2BHK, Kurla', 'Sample listing. Bright room in a shared 2BHK, ten minutes from the station.',
   1400000, 4000000, 'semi', 7, 6, 1, 1, array['WiFi', 'Washing machine', 'Lift'], 'halal_only', 'male'),
  ('00000000-0000-4000-8f00-000000000002', '00000000-0000-4000-a000-000000000013', 'entire_flat', 'mumbai', 'mira-road',
   'Sample: 1BHK flat, Mira Road', 'Sample listing. Family-friendly 1BHK close to shops and a masjid.',
   1800000, 6000000, 'unfurnished', 14, 11, 1, 1, array['Lift', 'Parking', 'Security'], 'non_veg_ok', 'family'),
  ('00000000-0000-4000-8f00-000000000003', '00000000-0000-4000-a000-000000000013', 'shared_room', 'mumbai', 'byculla',
   'Sample: shared room for working men, Byculla', 'Sample listing. Twin-sharing room, meals available nearby.',
   700000, 1400000, 'full', 3, 3, 1, 1, array['WiFi', 'Housekeeping'], 'halal_only', 'male'),
  ('00000000-0000-4000-8f00-000000000004', '00000000-0000-4000-a000-000000000016', 'pg_hostel', 'mumbai', 'andheri-west',
   'Sample: ladies PG, Andheri West', 'Sample listing. PG for working women with meals and laundry.',
   1200000, 2400000, 'full', 5, 3, 1, 1, array['WiFi', 'Meals', 'Laundry', 'Security'], 'halal_only', 'female'),
  ('00000000-0000-4000-8f00-000000000005', '00000000-0000-4000-a000-000000000014', 'private_room', 'bengaluru', 'frazer-town',
   'Sample: room for a working woman, Frazer Town', 'Sample listing. Quiet room in a 3BHK shared with two professionals.',
   1300000, 3900000, 'semi', 10, 6, 1, 1, array['WiFi', 'Washing machine'], 'halal_only', 'female'),
  ('00000000-0000-4000-8f00-000000000006', '00000000-0000-4000-a000-000000000014', 'entire_flat', 'bengaluru', 'koramangala',
   'Sample: 2BHK flat, Koramangala', 'Sample listing. Furnished 2BHK near tech parks.',
   3500000, 10000000, 'full', 21, 11, 2, 2, array['WiFi', 'Parking', 'Power backup', 'Lift'], 'non_veg_ok', 'any'),
  ('00000000-0000-4000-8f00-000000000007', '00000000-0000-4000-a000-000000000014', 'private_room', 'bengaluru', 'hsr-layout',
   'Sample: room in a 2BHK, HSR Layout', 'Sample listing. Room with attached bathroom, close to the bus stop.',
   1600000, 4800000, 'semi', 2, 6, 1, 1, array['WiFi', 'Power backup'], 'veg_only', 'any')
) as l (id, lister, type, city, area, title, description, rent, deposit, furnishing, in_days, min_stay, beds, baths, amenities, food, pref)
join public.cities c on c.slug = l.city
join public.neighbourhoods n on n.city_id = c.id and n.slug = l.area
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select distinct lister_id, 'flat_lister'::public.app_role from public.flat_listings where title like 'Sample: %'
on conflict (user_id, role) do nothing;

-- Fake "exact" addresses: the neighbourhood centre. The trigger derives the approximate public point.
insert into public.flat_listing_private (listing_id, address_line, landmark, exact_location)
select l.id, 'Sample Building, ' || n.name, 'Near Sample Chowk (not a real address)', n.center
from public.flat_listings l
join public.neighbourhoods n on n.id = l.neighbourhood_id
where l.title like 'Sample: %' and n.center is not null
on conflict (listing_id) do nothing;

-- Sample flatmate profiles ----------------------------------------------------------------------
insert into public.flatmate_profiles (user_id, city_id, neighbourhood_ids, budget_min, budget_max, move_date,
  preferred_gender, food_habit, smokes, ok_with_smoker, sleep_schedule, work_schedule, cleanliness, guests_policy, bio)
select f.id::uuid, c.id,
  array(select n.id from public.neighbourhoods n where n.city_id = c.id and n.slug = any (f.areas)),
  f.budget_min, f.budget_max, current_date + f.in_days, f.pref::public.flatmate_gender_pref, f.food::public.food_habit,
  false, false, f.sleep::public.sleep_schedule, f.work::public.work_schedule, f.clean, f.guests::public.guests_policy, f.bio
from (values
  ('00000000-0000-4000-a000-000000000015', 'mumbai', array['kurla', 'andheri-west'], 800000, 1500000, 15, 'male',
   'halal_only', 'early_bird', 'day_shift', 4, 'occasionally', 'Sample profile. Software engineer moving to Mumbai for a new job.'),
  ('00000000-0000-4000-a000-000000000011', 'mumbai', array['kurla', 'byculla'], 1000000, 1800000, 25, 'male',
   'halal_only', 'flexible', 'day_shift', 3, 'occasionally', 'Sample profile. Looking for one flatmate to share a 2BHK.'),
  ('00000000-0000-4000-a000-000000000016', 'mumbai', array['andheri-west', 'bandra-west'], 1000000, 1600000, 20, 'female',
   'halal_only', 'early_bird', 'day_shift', 5, 'no_guests', 'Sample profile. Accountant, tidy and quiet.'),
  ('00000000-0000-4000-a000-000000000012', 'bengaluru', array['frazer-town'], 1200000, 2000000, 30, 'female',
   'non_veg', 'night_owl', 'flexible', 3, 'occasionally', 'Sample profile. Designer working hybrid.')
) as f (id, city, areas, budget_min, budget_max, in_days, pref, food, sleep, work, clean, guests, bio)
join public.cities c on c.slug = f.city
on conflict (user_id) do nothing;
