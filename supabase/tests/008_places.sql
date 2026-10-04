-- Phase 5: places directory, suggestions, area guides, tips and votes, and the geo search RPCs.
begin;
select no_plan();
select tests.clear_sample_data();
delete from public.places;
delete from public.area_guides;

select tests.create_user('member', '910000000081');
select tests.create_user('member2', '910000000082');
select tests.create_user('buddy', '910000000083');
select tests.create_user('lister', '910000000084');
select tests.create_user('newbie', '910000000085');   -- has not finished onboarding
select tests.create_user('root');
select tests.make_admin('root');
update public.profiles set onboarding_completed_at = now(), full_name = 'Test User', gender = 'male',
  city_id = (select id from public.cities where slug = 'mumbai')
where id <> tests.get_user_id('newbie');

create temp table ids (key text primary key, id uuid);
grant all on ids to authenticated, anon;

-- ============================ PLACES ============================
select tests.authenticate_as('member');
select throws_ok(
  $$ insert into public.places (name, place_type, location, city_id, is_verified, created_by)
     values ('Fake Masjid', 'shia_masjid', extensions.st_point(72.88, 19.07, 4326)::extensions.geography,
             (select id from public.cities where slug = 'mumbai'), true, tests.get_user_id('member')) $$,
  '42501', null, 'a normal user cannot add a place'
);

select tests.authenticate_as('root');
select lives_ok(
  $$ with p as (
       insert into public.places (name, place_type, address, location, city_id, timings, is_verified, created_by)
       values ('Test Imambargah', 'imambargah', '1 Test Road, Kurla',
               extensions.st_point(72.8800, 19.0700, 4326)::extensions.geography,
               (select id from public.cities where slug = 'mumbai'), 'Majlis every Thursday', true, tests.get_user_id('root'))
       returning id)
     insert into ids select 'imambargah', id from p $$,
  'an admin can add a verified place'
);
select lives_ok(
  $$ with p as (
       insert into public.places (name, place_type, location, city_id, is_verified, created_by)
       values ('Unverified Grocery', 'halal_grocery', extensions.st_point(72.8810, 19.0710, 4326)::extensions.geography,
               (select id from public.cities where slug = 'mumbai'), false, tests.get_user_id('root'))
       returning id)
     insert into ids select 'unverified', id from p $$,
  'an admin can add an unverified place'
);
insert into public.places (name, place_type, location, city_id, is_verified, created_by)
values ('Far Masjid', 'shia_masjid', extensions.st_point(72.8300, 19.1400, 4326)::extensions.geography,
        (select id from public.cities where slug = 'mumbai'), true, tests.get_user_id('root'));
insert into public.place_photos (place_id, storage_path)
values ((select id from ids where key = 'imambargah'), (select id from ids where key = 'imambargah')::text || '/a.jpg'),
       ((select id from ids where key = 'unverified'), (select id from ids where key = 'unverified')::text || '/b.jpg');
select is((select count(*)::int from public.places), 3, 'an admin sees unverified places too');
select ok((select count(*) from public.audit_log where target_table = 'places') >= 3, 'place changes are audited');

select tests.authenticate_as_anon();
select is((select count(*)::int from public.places), 2, 'the public sees only verified places');
select is((select count(*)::int from public.place_photos), 1, 'and only their photos');
select throws_ok($$ select 1 from public.place_suggestions $$, '42501', null, 'the public cannot read suggestions');
select throws_ok($$ update public.places set name = 'Hacked' $$, '42501', null, 'the public cannot edit places');
select is((select count(*)::int from public.places_in_view(72.80, 19.00, 72.95, 19.20)), 2,
  'the map viewport query is public and returns verified places');
select is((select count(*)::int from public.places_in_view(72.87, 19.06, 72.89, 19.08)), 1,
  'and only those inside the viewport');
select is((select name from public.nearby_places(19.0700, 72.8800, 2)), 'Test Imambargah', 'nearby places are public');
select is((select count(*)::int from public.nearby_places(19.0700, 72.8800, 2, '{halal_grocery}')), 0,
  'unverified places never appear in nearby results');
select throws_ok($$ select 1 from public.search_flats_near() $$, '42501', null, 'flat search needs sign-in');

select tests.authenticate_as('member');
select is((select count(*)::int from public.places), 2, 'signed-in users see only verified places');
update public.places set name = 'Renamed by a user';
select is((select count(*)::int from public.places where name = 'Renamed by a user'), 0, 'a user cannot edit a place');
delete from public.places;
select is((select count(*)::int from public.places), 2, 'a user cannot delete places');

-- Hidden places drop out
select tests.authenticate_as('root');
update public.places set hidden_at = now() where name = 'Far Masjid';
select tests.authenticate_as_anon();
select is((select count(*)::int from public.places), 1, 'a hidden place is not public');
select tests.authenticate_as('root');
update public.places set hidden_at = null where name = 'Far Masjid';

-- Suggestions ----------------------------------------------------------------------
select tests.authenticate_as('member');
select lives_ok(
  $$ insert into public.place_suggestions (user_id, payload, note)
     values (tests.get_user_id('member'), '{"name": "New Halal Cafe", "place_type": "halal_restaurant"}', 'Opened last month') $$,
  'a signed-in user can suggest a new place'
);
select lives_ok(
  $$ insert into public.place_suggestions (user_id, place_id, payload)
     values (tests.get_user_id('member'), (select id from ids where key = 'imambargah'), '{"timings": "Majlis every Friday"}') $$,
  'and a correction to an existing place'
);
select throws_ok(
  $$ insert into public.place_suggestions (user_id, payload) values (tests.get_user_id('member2'), '{"name": "x"}') $$,
  '42501', null, 'a suggestion cannot be made in someone else''s name'
);
select throws_ok(
  $$ insert into public.place_suggestions (user_id, payload, status) values (tests.get_user_id('member'), '{"name": "x"}', 'approved') $$,
  '42501', null, 'a user cannot approve their own suggestion on insert'
);
update public.place_suggestions set status = 'approved';
select is((select count(*)::int from public.place_suggestions where status = 'approved'), 0,
  'a user cannot approve their own suggestion afterwards');
select throws_ok(
  $$ insert into public.place_suggestions (user_id, payload) values (tests.get_user_id('member'), '[1, 2]') $$,
  '23514', null, 'the payload must be an object'
);
select tests.authenticate_as('newbie');
select throws_ok(
  $$ insert into public.place_suggestions (user_id, payload) values (tests.get_user_id('newbie'), '{"name": "x"}') $$,
  'P0001', 'onboarding_required', 'onboarding must be finished before suggesting'
);
select tests.authenticate_as('member2');
select is_empty($$ select 1 from public.place_suggestions $$, 'other users cannot see a suggestion');
select tests.authenticate_as('root');
select is((select count(*)::int from public.place_suggestions), 2, 'an admin sees all suggestions');
select lives_ok(
  $$ update public.place_suggestions set status = 'rejected', reviewed_by = tests.get_user_id('root'), reviewed_at = now(),
       review_note = 'Duplicate' where place_id is null $$,
  'an admin can decide a suggestion'
);
select tests.authenticate_as('member');
select is((select review_note from public.place_suggestions where place_id is null), 'Duplicate', 'the author sees the decision');

-- ============================ AREA GUIDES & TIPS ============================
select tests.authenticate_as('member');
select throws_ok(
  $$ insert into public.area_guides (neighbourhood_id, summary, is_published, updated_by)
     values ((select id from public.neighbourhoods where slug = 'kurla'), 'x', true, tests.get_user_id('member')) $$,
  '42501', null, 'a normal user cannot write a guide'
);
select tests.authenticate_as('root');
select lives_ok(
  $$ insert into public.area_guides (neighbourhood_id, summary, rent_ranges, is_published, updated_by)
     values ((select id from public.neighbourhoods where slug = 'kurla'), 'Well connected, many community families.',
             '{"private_room": {"min": 800000, "max": 1500000}}', true, tests.get_user_id('root')),
            ((select id from public.neighbourhoods where slug = 'byculla'), 'Draft guide', '{}', false, tests.get_user_id('root')) $$,
  'an admin can write guides'
);
select tests.authenticate_as_anon();
select is((select count(*)::int from public.area_guides), 1, 'the public sees only published guides');
select tests.authenticate_as('member');
select is((select count(*)::int from public.area_guides), 1, 'so do signed-in users');

-- Tips: verified buddies only
select tests.clear_authentication();
insert into public.buddy_profiles (user_id, city_id)
values (tests.get_user_id('buddy'), (select id from public.cities where slug = 'mumbai'));
select tests.authenticate_as('buddy');
select ok(not public.can_post_area_tip(), 'an unverified buddy cannot post tips yet');
select throws_ok(
  $$ insert into public.area_tips (neighbourhood_id, author_id, body)
     values ((select id from public.neighbourhoods where slug = 'kurla'), tests.get_user_id('buddy'), 'Try the bakery near the station') $$,
  '42501', null, 'an unverified buddy cannot post a tip'
);
select tests.authenticate_as('root');
select public.admin_review_verification(id, true) from public.verification_requests where kind = 'buddy';
select tests.authenticate_as('buddy');
select lives_ok(
  $$ with t as (
       insert into public.area_tips (neighbourhood_id, author_id, body)
       values ((select id from public.neighbourhoods where slug = 'kurla'), tests.get_user_id('buddy'), 'Try the bakery near the station')
       returning id)
     insert into ids select 'tip', id from t $$,
  'a verified buddy can post a tip'
);
select throws_ok(
  $$ insert into public.area_tips (neighbourhood_id, author_id, body)
     values ((select id from public.neighbourhoods where slug = 'kurla'), tests.get_user_id('member'), 'Forged tip here') $$,
  '42501', null, 'a tip cannot be posted as someone else'
);
select throws_ok(
  $$ update public.area_tips set upvote_count = 999 $$, '42501', null, 'the upvote count cannot be edited'
);
select throws_ok(
  $$ insert into public.area_tip_votes (tip_id, user_id) values ((select id from ids where key = 'tip'), tests.get_user_id('buddy')) $$,
  'P0001', 'own_tip', 'an author cannot upvote their own tip'
);
select tests.authenticate_as('member');
select throws_ok(
  $$ insert into public.area_tips (neighbourhood_id, author_id, body)
     values ((select id from public.neighbourhoods where slug = 'kurla'), tests.get_user_id('member'), 'I am not a buddy') $$,
  '42501', null, 'a member who is not a verified buddy cannot post a tip'
);
select lives_ok(
  $$ insert into public.area_tip_votes (tip_id, user_id) values ((select id from ids where key = 'tip'), tests.get_user_id('member')) $$,
  'a member can upvote a tip'
);
select throws_ok(
  $$ insert into public.area_tip_votes (tip_id, user_id) values ((select id from ids where key = 'tip'), tests.get_user_id('member')) $$,
  '23505', null, 'one vote per user per tip'
);
select throws_ok(
  $$ insert into public.area_tip_votes (tip_id, user_id) values ((select id from ids where key = 'tip'), tests.get_user_id('member2')) $$,
  '42501', null, 'a vote cannot be cast for someone else'
);
select tests.authenticate_as('member2');
insert into public.area_tip_votes (tip_id, user_id) values ((select id from ids where key = 'tip'), tests.get_user_id('member2'));
select is((select upvote_count from public.area_tips), 2, 'the upvote count follows the votes');
select is((select count(*)::int from public.area_tip_votes), 1, 'a user sees only their own votes');
delete from public.area_tip_votes;
select is((select upvote_count from public.area_tips), 1, 'removing a vote lowers the count (and only your own vote is removed)');
select throws_ok(
  $$ select public.delete_area_tip((select id from ids where key = 'tip')) $$,
  'P0002', 'tip_not_found', 'only the author can delete a tip'
);

select tests.authenticate_as_anon();
select is((select count(*)::int from public.area_tips), 1, 'the public can read tips');
select throws_ok(
  $$ insert into public.area_tip_votes (tip_id, user_id) values ((select id from ids where key = 'tip'), tests.get_user_id('member')) $$,
  '42501', null, 'the public cannot vote'
);

-- Moderation and deletion
select tests.authenticate_as('root');
update public.area_tips set hidden_at = now();
select tests.authenticate_as_anon();
select is_empty($$ select 1 from public.area_tips $$, 'a hidden tip is not shown');
select tests.authenticate_as('root');
update public.area_tips set hidden_at = null;
select tests.authenticate_as('buddy');
select lives_ok($$ select public.delete_area_tip((select id from ids where key = 'tip')) $$, 'the author can delete their tip');
select is_empty($$ select 1 from public.area_tips $$, 'a deleted tip disappears');
select tests.authenticate_as('root');
select is((select count(*)::int from public.area_tips where deleted_at is not null), 1, 'but is kept for moderation');

-- ============================ FLATS NEAR A MASJID AND A WORKPLACE ============================
-- Flat A sits ~300 m from the imambargah; flat B ~8 km away (near the far masjid); flat C far from both.
select tests.clear_authentication();
insert into public.flat_listings (id, lister_id, listing_type, city_id, title, rent, available_from, status)
select gen_random_uuid(), tests.get_user_id('lister'), 'private_room', (select id from public.cities where slug = 'mumbai'),
       t.title, t.rent, current_date, 'active'
from (values ('Flat A near imambargah', 1200000), ('Flat B near far masjid', 2000000), ('Flat C far from both', 900000)) as t (title, rent);
insert into public.flat_listing_private (listing_id, address_line, exact_location)
select l.id, 'Test address', extensions.st_point(c.lng, c.lat, 4326)::extensions.geography
from public.flat_listings l
join (values ('Flat A near imambargah', 19.0720, 72.8815), ('Flat B near far masjid', 19.1410, 72.8310),
             ('Flat C far from both', 19.2300, 72.9700)) as c (title, lat, lng) on c.title = l.title;

select ok(
  (select bool_and(extensions.st_distance(l.approx_location, p.exact_location) between 1 and 550)
   from public.flat_listings l join public.flat_listing_private p on p.listing_id = l.id),
  'search works on approximate points that differ from the exact ones');

select tests.authenticate_as('member');
select is((select count(*)::int from public.search_flats_near()), 3, 'without filters all visible flats are returned');
select is(
  (select array_agg(title order by title) from public.search_flats_near(p_masjid_radius_km => 1.5)),
  array['Flat A near imambargah', 'Flat B near far masjid'],
  'the masjid radius keeps flats near a verified masjid or imambargah');
select is(
  (select nearest_masjid_name from public.search_flats_near(p_masjid_radius_km => 1.5) where title like 'Flat A%'),
  'Test Imambargah', 'the nearest masjid/imambargah is named');
select ok(
  (select nearest_masjid_distance_m between 0 and 1500 from public.search_flats_near(p_masjid_radius_km => 1.5) where title like 'Flat A%'),
  'with its distance');
select is(
  (select array_agg(title) from public.search_flats_near(p_masjid_radius_km => 1.5, p_workplace_lat => 19.0700, p_workplace_lng => 72.8800, p_workplace_radius_km => 3)),
  array['Flat A near imambargah'],
  'masjid radius AND workplace radius together');
select ok(
  (select workplace_distance_m between 0 and 1500 from public.search_flats_near(p_workplace_lat => 19.0700, p_workplace_lng => 72.8800, p_workplace_radius_km => 3)),
  'the distance to the workplace is returned');
select is((select count(*)::int from public.search_flats_near(p_rent_max => 1000000)), 1, 'the rent filter still applies');
select is((select count(*)::int from public.search_flats_near(p_min_lng => 72.86, p_min_lat => 19.05, p_max_lng => 72.90, p_max_lat => 19.09)), 1,
  'the map viewport filter applies');
select is_empty($$ select 1 from public.flat_listing_private $$, 'searching never exposes the exact address');

-- An unverified masjid does not count for the masjid filter
select tests.authenticate_as('root');
update public.places set is_verified = false where name = 'Far Masjid';
select tests.authenticate_as('member');
select is(
  (select array_agg(title) from public.search_flats_near(p_masjid_radius_km => 1.5)),
  array['Flat A near imambargah'], 'an unverified masjid does not satisfy the masjid filter');

-- RLS still applies inside the search: a blocked lister's flats are gone
select tests.authenticate_as('lister');
insert into public.blocks (blocker_id, blocked_id) values (tests.get_user_id('lister'), tests.get_user_id('member'));
select is_empty($$ select 1 from public.search_flats_near() $$, 'a lister does not see their own flats in search');
select tests.authenticate_as('member');
select is_empty($$ select 1 from public.search_flats_near() $$, 'a blocked user finds none of the lister''s flats');

select * from finish();
rollback;
