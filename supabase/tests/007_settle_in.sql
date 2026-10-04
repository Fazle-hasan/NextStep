-- Phase 4: Settle In. Flats (exact address protection, gender filter, expiry), chat (participants only,
-- blocks, rate limit), relocation requests and buddies, flatmate matching.
begin;
select no_plan();
select tests.clear_sample_data();

select tests.create_user('lister', '910000000071');
select tests.create_user('amir', '910000000072');
select tests.create_user('sara', '910000000073');
select tests.create_user('zed', '910000000074');
select tests.create_user('buddy_m', '910000000075');
select tests.create_user('buddy_f', '910000000076');
select tests.create_user('spammer', '910000000077');
select tests.create_user('root');
select tests.make_admin('root');
update public.profiles set onboarding_completed_at = now(), full_name = 'Test User', gender = 'male',
  city_id = (select id from public.cities where slug = 'mumbai');
update public.profiles set gender = 'female' where id in (tests.get_user_id('sara'), tests.get_user_id('buddy_f'));

create temp table ids (key text primary key, id uuid);
grant all on ids to authenticated, anon;

-- ============================ FLATS ============================
select tests.authenticate_as('lister');
select lives_ok(
  $$ with l as (
       insert into public.flat_listings (lister_id, listing_type, city_id, title, rent, available_from)
       values (tests.get_user_id('lister'), 'private_room', (select id from public.cities where slug = 'mumbai'),
               'Sunny room near the station', 1500000, current_date + 7)
       returning id)
     insert into ids select 'flat', id from l $$,
  'a user can create a listing'
);
select ok(public.has_role('flat_lister'), 'creating a listing grants the flat_lister role');
select is((select status::text from public.flat_listings), 'paused', 'a new listing is not live yet');
select throws_ok(
  $$ select public.set_listing_status((select id from ids where key = 'flat'), 'active') $$,
  'P0001', 'address_required', 'a listing cannot go live without an address'
);
select lives_ok(
  $$ select public.save_listing_address((select id from ids where key = 'flat'), '12 Fake Street, Kurla West', 'Opp. Sample Bakery', 19.0726, 72.8845) $$,
  'the lister can save the exact address'
);
select ok((select approx_location is not null from public.flat_listings), 'an approximate point is stored on the listing');
select ok(
  (select extensions.st_distance(l.approx_location, p.exact_location) between 1 and 550
   from public.flat_listings l join public.flat_listing_private p on p.listing_id = l.id),
  'the approximate point is offset from the exact one but within ~500 m');
select lives_ok(
  $$ select public.save_listing_address((select id from ids where key = 'flat'), '12 Fake Street, Kurla West', null, 19.0726, 72.8845) $$,
  'saving the address again works');
select is(
  (select count(distinct extensions.st_astext(approx_location::extensions.geometry))::int from public.flat_listings), 1,
  'the approximate point is stable for a listing');
select lives_ok($$ select public.set_listing_status((select id from ids where key = 'flat'), 'active') $$,
  'the lister can publish the listing');
select throws_ok($$ update public.flat_listings set status = 'rented' $$, '42501', null,
  'status cannot be edited directly');
select throws_ok($$ update public.flat_listings set expires_at = now() + interval '10 years' $$, '42501', null,
  'expiry cannot be edited directly');
select throws_ok(
  $$ update public.flat_listings set approx_location = extensions.st_point(0, 0, 4326)::extensions.geography $$,
  '42501', null, 'the approximate point cannot be edited directly');
select throws_ok(
  $$ select public.send_contact_request((select id from ids where key = 'flat'), 'Hi') $$,
  'P0001', 'own_listing', 'a lister cannot contact their own listing'
);

-- Photos
select lives_ok(
  $$ insert into public.flat_listing_photos (listing_id, storage_path, position)
     select (select id from ids where key = 'flat'), (select id from ids where key = 'flat')::text || '/p' || n || '.jpg', n
     from generate_series(0, 9) n $$,
  'the lister can add 10 photos'
);
select throws_ok(
  $$ insert into public.flat_listing_photos (listing_id, storage_path)
     values ((select id from ids where key = 'flat'), (select id from ids where key = 'flat')::text || '/p10.jpg') $$,
  'P0001', 'photo_limit_reached', 'an 11th photo is refused'
);

-- Signed-out visitors (D-012)
select tests.authenticate_as_anon();
select throws_ok($$ select 1 from public.flat_listings $$, '42501', null, 'signed-out visitors cannot read listings');
select throws_ok($$ select 1 from public.flat_listing_private $$, '42501', null, 'signed-out visitors cannot read addresses');
select throws_ok($$ select 1 from public.messages $$, '42501', null, 'signed-out visitors cannot read messages');

-- THE critical rule: no exact address without an accepted contact request ----------------
select tests.authenticate_as('amir');
select is((select count(*)::int from public.flat_listings), 1, 'a signed-in user sees the live listing');
select is((select count(*)::int from public.flat_listing_photos), 10, 'and its photos');
select is_empty($$ select 1 from public.flat_listing_private $$, 'a stranger cannot read the exact address');
select is_empty($$ select 1 from public.get_listing_address((select id from ids where key = 'flat')) $$,
  'nor through the address RPC');
select throws_ok(
  $$ insert into public.flat_listing_private (listing_id, address_line, exact_location)
     values ((select id from ids where key = 'flat'), 'Hijacked address', extensions.st_point(72.8, 19.0, 4326)::extensions.geography) $$,
  '42501', null, 'a stranger cannot write an address'
);
select throws_ok(
  $$ insert into public.flat_listing_photos (listing_id, storage_path)
     values ((select id from ids where key = 'flat'), (select id from ids where key = 'flat')::text || '/evil.jpg') $$,
  '42501', null, 'a stranger cannot add photos'
);
select throws_ok(
  $$ insert into public.flat_contact_requests (listing_id, requester_id, intro, status)
     values ((select id from ids where key = 'flat'), tests.get_user_id('amir'), 'x', 'accepted') $$,
  '42501', null, 'a contact request cannot be inserted directly (no self-accepting)'
);
select lives_ok(
  $$ insert into ids select 'req_amir', public.send_contact_request((select id from ids where key = 'flat'), 'Salaam, I am moving for work') $$,
  'an interested user can send a contact request'
);
select throws_ok(
  $$ select public.send_contact_request((select id from ids where key = 'flat'), 'Again') $$,
  'P0001', 'already_requested', 'only one live request per listing'
);
select is_empty($$ select 1 from public.flat_listing_private $$, 'a PENDING request does not reveal the address');
select throws_ok(
  $$ update public.flat_contact_requests set status = 'accepted' $$, '42501', null,
  'the requester cannot accept their own request'
);
select throws_ok(
  $$ select public.respond_contact_request((select id from ids where key = 'req_amir'), true) $$,
  'P0002', 'request_not_found', 'only the lister can respond'
);

select tests.authenticate_as('sara');
select lives_ok(
  $$ insert into ids select 'req_sara', public.send_contact_request((select id from ids where key = 'flat'), 'Interested') $$,
  'a second user can send a request'
);
select is((select count(*)::int from public.flat_contact_requests), 1, 'a requester sees only their own request');

select tests.authenticate_as('lister');
select is((select count(*)::int from public.flat_contact_requests), 2, 'the lister sees requests on their listing');
select lives_ok(
  $$ insert into ids select 'conv_flat', public.respond_contact_request((select id from ids where key = 'req_amir'), true) $$,
  'the lister can accept a request'
);
select ok((select id is not null from ids where key = 'conv_flat'), 'accepting opens a conversation');
select lives_ok($$ select public.respond_contact_request((select id from ids where key = 'req_sara'), false) $$,
  'the lister can decline a request');

select tests.authenticate_as('amir');
select is((select address_line from public.flat_listing_private), '12 Fake Street, Kurla West',
  'an ACCEPTED requester can read the exact address');
select is((select count(*)::int from public.get_listing_address((select id from ids where key = 'flat'))), 1,
  'and the address RPC returns it');
select tests.authenticate_as('sara');
select is_empty($$ select 1 from public.flat_listing_private $$, 'a DECLINED requester cannot read the exact address');
select tests.authenticate_as('zed');
select is_empty($$ select 1 from public.flat_listing_private $$, 'an unrelated user still cannot read the exact address');
select is_empty($$ select 1 from public.flat_contact_requests $$, 'nor other people''s contact requests');
select tests.authenticate_as('root');
select is((select count(*)::int from public.flat_listing_private), 1, 'an admin can read the address');

-- ============================ CHAT ============================
select tests.authenticate_as('amir');
select is((select count(*)::int from public.conversations), 1, 'the requester is in the new conversation');
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ((select id from ids where key = 'conv_flat'), tests.get_user_id('amir'), 'Salaam! When can I visit?') $$,
  'a participant can send a message'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ((select id from ids where key = 'conv_flat'), tests.get_user_id('lister'), 'Forged') $$,
  '42501', null, 'a participant cannot send as someone else'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, attachment_path)
     values ((select id from ids where key = 'conv_flat'), tests.get_user_id('amir'), 'other-folder/pic.jpg') $$,
  '22023', 'invalid_attachment', 'an attachment must live in the conversation folder'
);
select throws_ok(
  $$ insert into public.conversations (context_type, context_id) values ('flat_contact', gen_random_uuid()) $$,
  '42501', null, 'conversations cannot be created directly (no cold messaging)'
);
select throws_ok(
  $$ insert into public.conversation_participants (conversation_id, user_id)
     values ((select id from ids where key = 'conv_flat'), tests.get_user_id('amir')) $$,
  '42501', null, 'participants cannot be added directly'
);
select throws_ok($$ update public.messages set body = 'edited' $$, '42501', null, 'messages cannot be edited');

-- Everything in a test shares one transaction timestamp, so move the lister's last read back a minute.
select tests.clear_authentication();
update public.conversation_participants set last_read_at = now() - interval '1 minute'
where user_id = tests.get_user_id('lister');
select tests.authenticate_as('lister');
select is((select count(*)::int from public.messages), 1, 'the other participant reads the message');
select is((select unread_count from public.get_my_conversations()), 1, 'the unread count is 1');
select lives_ok($$ select public.mark_conversation_read((select id from ids where key = 'conv_flat')) $$, 'mark as read works');
select is((select unread_count from public.get_my_conversations()), 0, 'the unread count drops to 0');
select throws_ok(
  $$ select public.delete_message((select id from public.messages limit 1)) $$,
  'P0002', 'message_not_found', 'a participant cannot delete the other person''s message'
);

-- Non-participants
select tests.authenticate_as('zed');
select is_empty($$ select 1 from public.messages $$, 'a non-participant can never read messages');
select is_empty($$ select 1 from public.conversations $$, 'nor see the conversation');
select is_empty($$ select 1 from public.conversation_participants $$, 'nor its participants');
select is_empty($$ select 1 from public.get_my_conversations() $$, 'and has no conversations listed');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ((select id from ids where key = 'conv_flat'), tests.get_user_id('zed'), 'Let me in') $$,
  '42501', null, 'a non-participant cannot send a message'
);
select lives_ok($$ select public.mark_conversation_read((select id from ids where key = 'conv_flat')) $$,
  'mark-read by a non-participant is a no-op');
select tests.authenticate_as('root');
select is((select count(*)::int from public.messages), 1, 'an admin can read messages for moderation');

-- Blocks stop messages
select tests.authenticate_as('lister');
insert into public.blocks (blocker_id, blocked_id) values (tests.get_user_id('lister'), tests.get_user_id('amir'));
select tests.authenticate_as('amir');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ((select id from ids where key = 'conv_flat'), tests.get_user_id('amir'), 'Hello?') $$,
  'P0001', 'blocked', 'a blocked user cannot message'
);
select is_empty($$ select 1 from public.flat_listings $$, 'a blocked user no longer sees the lister''s listing');
select is_empty($$ select 1 from public.flat_listing_private $$, 'nor the exact address');
select tests.authenticate_as('lister');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ((select id from ids where key = 'conv_flat'), tests.get_user_id('lister'), 'Hi') $$,
  'P0001', 'blocked', 'the blocker cannot message the blocked user either'
);
delete from public.blocks where blocker_id = tests.get_user_id('lister');

-- Soft delete and rate limit
select tests.authenticate_as('amir');
select lives_ok($$ select public.delete_message((select id from public.messages limit 1)) $$, 'the sender can delete their message');
select is_empty($$ select 1 from public.messages $$, 'a deleted message disappears for participants');
select tests.authenticate_as('root');
select is((select count(*)::int from public.messages where deleted_at is not null), 1, 'but is kept for moderation');
select tests.authenticate_as('amir');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select (select id from ids where key = 'conv_flat'), tests.get_user_id('amir'), 'spam ' || n from generate_series(1, 31) n $$,
  'P0001', 'rate_limit_exceeded', 'more than 30 messages a minute are refused'
);

-- Withdrawing removes address access
select lives_ok($$ select public.withdraw_contact_request((select id from ids where key = 'req_amir')) $$,
  'the requester can withdraw');
select is_empty($$ select 1 from public.flat_listing_private $$, 'after withdrawing, the address is hidden again');

-- Gender preference is enforced in the database ---------------------------------------
select tests.authenticate_as('lister');
select lives_ok(
  $$ with l as (
       insert into public.flat_listings (lister_id, listing_type, city_id, title, rent, available_from, tenant_gender_pref)
       values (tests.get_user_id('lister'), 'shared_room', (select id from public.cities where slug = 'mumbai'),
               'Room for women only', 900000, current_date + 3, 'female')
       returning id)
     insert into ids select 'flat_f', id from l $$,
  'a female-only listing can be created'
);
select public.save_listing_address((select id from ids where key = 'flat_f'), '5 Sample Lane, Andheri', null, 19.1197, 72.8464);
select public.set_listing_status((select id from ids where key = 'flat_f'), 'active');

select tests.authenticate_as('amir');
select is_empty($$ select 1 from public.flat_listings where id = (select id from ids where key = 'flat_f') $$,
  'a male user cannot see a female-only listing');
select is_empty($$ select 1 from public.search_flats() where id = (select id from ids where key = 'flat_f') $$,
  'nor find it in search');
select is_empty($$ select 1 from public.flat_listing_photos where listing_id = (select id from ids where key = 'flat_f') $$,
  'nor its photos');
select throws_ok(
  $$ select public.send_contact_request((select id from ids where key = 'flat_f'), 'Hi') $$,
  'P0001', 'listing_not_available', 'nor send it a contact request'
);
select tests.authenticate_as('sara');
select is((select count(*)::int from public.search_flats()), 2, 'a female user finds both listings');
select is((select count(*)::int from public.search_flats(p_rent_max => 1000000)), 1, 'the rent filter works');

-- Expiry -------------------------------------------------------------------------------
select tests.clear_authentication();
select is((select count(*)::int from cron.job where jobname = 'expire-flat-listings'), 1, 'the expiry job is scheduled');
update public.flat_listings set expires_at = now() - interval '1 hour' where id = (select id from ids where key = 'flat_f');
select tests.authenticate_as('sara');
select is_empty($$ select 1 from public.flat_listings where id = (select id from ids where key = 'flat_f') $$,
  'a listing past its expiry is hidden even before the job runs');
select tests.clear_authentication();
update public.flat_listings set status = 'expired' where status = 'active' and expires_at <= now();
select is((select status::text from public.flat_listings where id = (select id from ids where key = 'flat_f')),
  'expired', 'the job marks it expired');
select tests.authenticate_as('lister');
select throws_ok(
  $$ select public.set_listing_status((select id from ids where key = 'flat_f'), 'active') $$,
  'P0001', 'listing_expired', 'an expired listing must be renewed'
);
select lives_ok($$ select public.renew_listing((select id from ids where key = 'flat_f')) $$, 'the lister can renew');
select ok((select status = 'active' and expires_at > now() + interval '29 days' from public.flat_listings
           where id = (select id from ids where key = 'flat_f')), 'renewing gives 30 more days');
select tests.authenticate_as('zed');
select throws_ok(
  $$ select public.renew_listing((select id from ids where key = 'flat_f')) $$,
  'P0002', 'listing_not_found', 'only the lister can renew'
);
select tests.authenticate_as('lister');
with l as (
  insert into public.flat_listings (lister_id, listing_type, city_id, title, rent, available_from)
  values (tests.get_user_id('lister'), 'private_room', (select id from public.cities where slug = 'mumbai'),
          'Room without an address yet', 800000, current_date + 5)
  returning id)
insert into ids select 'flat_noaddr', id from l;
select throws_ok(
  $$ select public.renew_listing((select id from ids where key = 'flat_noaddr')) $$,
  'P0001', 'address_required', 'renewing cannot make a listing live without an address'
);
select lives_ok($$ select public.delete_listing((select id from ids where key = 'flat_f')) $$, 'the lister can delete a listing');
select tests.authenticate_as('sara');
select is_empty($$ select 1 from public.flat_listings where id = (select id from ids where key = 'flat_f') $$,
  'a deleted listing is gone for others');

-- Contact request rate limit (10 a day)
select tests.clear_authentication();
insert into public.flat_listings (lister_id, listing_type, city_id, title, rent, available_from, status)
select tests.get_user_id('lister'), 'entire_flat', (select id from public.cities where slug = 'mumbai'),
       'Bulk flat ' || n, 2000000, current_date, 'active'
from generate_series(1, 11) n;
select tests.authenticate_as('spammer');
select throws_ok(
  $$ select public.send_contact_request(l.id, 'Hi') from public.flat_listings l where l.title like 'Bulk flat %' $$,
  'P0001', 'rate_limit_exceeded', 'more than 10 contact requests a day are refused'
);

-- ============================ RELOCATION & BUDDIES ============================
select tests.authenticate_as('buddy_m');
select lives_ok(
  $$ insert into public.buddy_profiles (user_id, city_id, bio)
     values (tests.get_user_id('buddy_m'), (select id from public.cities where slug = 'mumbai'), 'Happy to help') $$,
  'a user can create a buddy profile'
);
select is((select verification_status::text from public.buddy_profiles), 'pending', 'a new buddy starts unverified');
select throws_ok($$ update public.buddy_profiles set verification_status = 'approved' $$, '42501', null,
  'a buddy cannot verify themselves');
select tests.authenticate_as('buddy_f');
insert into public.buddy_profiles (user_id, city_id)
values (tests.get_user_id('buddy_f'), (select id from public.cities where slug = 'mumbai'));

select tests.authenticate_as('amir');
select lives_ok(
  $$ with r as (
       insert into public.relocation_requests (user_id, city_id, move_from, household, needs, note)
       values (tests.get_user_id('amir'), (select id from public.cities where slug = 'mumbai'), current_date + 20,
               'alone', '{flat,nearby_masjid}', 'Starting a new job in BKC')
       returning id)
     insert into ids select 'reloc', id from r $$,
  'a user can create a relocation request'
);
select throws_ok($$ update public.relocation_requests set status = 'closed' $$, '42501', null,
  'request status cannot be edited directly');
select tests.authenticate_as('sara');
select lives_ok(
  $$ with r as (
       insert into public.relocation_requests (user_id, city_id, move_from, household, needs, same_gender_buddies_only)
       values (tests.get_user_id('sara'), (select id from public.cities where slug = 'mumbai'), current_date + 30,
               'alone', '{flat}', true)
       returning id)
     insert into ids select 'reloc_f', id from r $$,
  'a request can ask for same-gender buddies only'
);
select is_empty($$ select 1 from public.buddy_profiles $$, 'unverified buddies are not visible to requesters');

select tests.authenticate_as('buddy_m');
select is_empty($$ select 1 from public.relocation_requests $$, 'an unverified buddy sees no requests');
select throws_ok(
  $$ select public.offer_help((select id from ids where key = 'reloc')) $$,
  'P0001', 'request_not_available', 'an unverified buddy cannot offer help'
);

select tests.authenticate_as('root');
select public.admin_review_verification(id, true) from public.verification_requests where kind = 'buddy';
select is((select count(*)::int from public.buddy_profiles where verification_status = 'approved'), 2,
  'approving a buddy request updates the buddy profile');

select tests.authenticate_as('buddy_m');
select is((select count(*)::int from public.relocation_requests), 1, 'a verified buddy sees open requests in their city');
select is_empty($$ select 1 from public.relocation_requests where id = (select id from ids where key = 'reloc_f') $$,
  'but not a request that asked for buddies of the other gender');
select tests.authenticate_as('buddy_f');
select is((select count(*)::int from public.relocation_requests), 2, 'a same-gender buddy sees both requests');
select tests.authenticate_as('zed');
select is_empty($$ select 1 from public.relocation_requests $$, 'a user who is not a buddy sees no requests');
select is_empty($$ select 1 from public.buddy_profiles $$, 'and no buddy profiles without an open request');
select throws_ok(
  $$ select public.offer_help((select id from ids where key = 'reloc')) $$,
  'P0001', 'request_not_available', 'a non-buddy cannot offer help'
);
select tests.authenticate_as('sara');
select is((select count(*)::int from public.buddy_profiles), 2, 'a requester sees verified buddies in the destination city');

-- A buddy in another city sees nothing
select tests.authenticate_as('buddy_f');
update public.buddy_profiles set city_id = (select id from public.cities where slug <> 'mumbai' order by slug limit 1);
select is_empty($$ select 1 from public.relocation_requests $$, 'a buddy in another city sees no requests');
update public.buddy_profiles set city_id = (select id from public.cities where slug = 'mumbai');

-- Offers
select tests.authenticate_as('buddy_m');
select lives_ok(
  $$ insert into ids select 'offer', public.offer_help((select id from ids where key = 'reloc'), 'I live nearby and can show you around') $$,
  'a verified buddy can offer help'
);
select throws_ok(
  $$ select public.offer_help((select id from ids where key = 'reloc')) $$,
  'P0001', 'already_offered', 'one offer per request'
);
select throws_ok($$ update public.relocation_offers set status = 'accepted' $$, '42501', null,
  'a buddy cannot accept their own offer');
select throws_ok(
  $$ select public.respond_to_offer((select id from ids where key = 'offer'), true) $$,
  'P0002', 'offer_not_found', 'only the requester can respond to an offer'
);
select tests.authenticate_as('sara');
select is_empty($$ select 1 from public.relocation_offers $$, 'other users cannot see the offer');

select tests.authenticate_as('amir');
select is((select count(*)::int from public.relocation_offers), 1, 'the requester sees offers on their request');
select throws_ok(
  $$ select public.rate_buddy((select id from ids where key = 'reloc'), tests.get_user_id('buddy_m'), 5::smallint) $$,
  'P0001', 'request_not_closed', 'a buddy cannot be rated before the request is closed'
);
select lives_ok(
  $$ insert into ids select 'conv_reloc', public.respond_to_offer((select id from ids where key = 'offer'), true) $$,
  'the requester can accept an offer'
);
select ok((select id is not null from ids where key = 'conv_reloc'), 'accepting opens a conversation');
select tests.authenticate_as('buddy_m');
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ((select id from ids where key = 'conv_reloc'), tests.get_user_id('buddy_m'), 'Welcome to Mumbai!') $$,
  'the buddy can chat after acceptance'
);
select tests.authenticate_as('buddy_f');
select is_empty($$ select 1 from public.messages $$, 'another buddy cannot read that chat');

select tests.authenticate_as('amir');
select lives_ok($$ select public.close_relocation_request((select id from ids where key = 'reloc')) $$,
  'the requester can close the request');
select throws_ok(
  $$ select public.rate_buddy((select id from ids where key = 'reloc'), tests.get_user_id('buddy_f'), 5::smallint) $$,
  'P0001', 'offer_not_accepted', 'only an accepted buddy can be rated'
);
select lives_ok(
  $$ select public.rate_buddy((select id from ids where key = 'reloc'), tests.get_user_id('buddy_m'), 5::smallint, 'Very kind') $$,
  'the requester can rate the buddy'
);
select throws_ok(
  $$ select public.rate_buddy((select id from ids where key = 'reloc'), tests.get_user_id('buddy_m'), 1::smallint) $$,
  'P0001', 'already_rated', 'a buddy is rated once per request'
);
select tests.authenticate_as('buddy_m');
select is((select rating_count from public.buddy_profiles where user_id = tests.get_user_id('buddy_m')), 1,
  'the buddy''s rating is updated');
select is_empty($$ select 1 from public.relocation_requests where status = 'open' $$,
  'a closed request leaves the open list (and the male buddy cannot see the female-only one)');

-- ============================ FLATMATES ============================
-- amir: male, wants male. zed: male, any. sara: female, wants female. buddy_f: female, any.
select tests.authenticate_as('amir');
select lives_ok(
  $$ insert into public.flatmate_profiles (user_id, city_id, budget_min, budget_max, move_date, preferred_gender, food_habit)
     values (tests.get_user_id('amir'), (select id from public.cities where slug = 'mumbai'), 800000, 1500000, current_date + 20, 'male', 'halal_only') $$,
  'a user can create a flatmate profile'
);
select tests.authenticate_as('zed');
insert into public.flatmate_profiles (user_id, city_id, budget_min, budget_max, move_date, preferred_gender, food_habit)
values (tests.get_user_id('zed'), (select id from public.cities where slug = 'mumbai'), 1000000, 2000000, current_date + 25, 'any', 'halal_only');
select tests.authenticate_as('sara');
insert into public.flatmate_profiles (user_id, city_id, budget_min, budget_max, move_date, preferred_gender, food_habit)
values (tests.get_user_id('sara'), (select id from public.cities where slug = 'mumbai'), 800000, 1500000, current_date + 20, 'female', 'veg');
select tests.authenticate_as('buddy_f');
insert into public.flatmate_profiles (user_id, city_id, budget_min, budget_max, move_date, preferred_gender, food_habit)
values (tests.get_user_id('buddy_f'), (select id from public.cities where slug = 'mumbai'), 800000, 1500000, current_date + 20, 'any', 'non_veg');
select tests.authenticate_as('lister');
insert into public.flatmate_profiles (user_id, city_id, budget_min, budget_max, move_date, preferred_gender, food_habit)
values (tests.get_user_id('lister'), (select id from public.cities where slug <> 'mumbai' order by slug limit 1),
        800000, 1500000, current_date + 20, 'any', 'halal_only');
select is((select count(*)::int from public.flatmate_profiles), 1, 'a profile in another city sees nobody');

select tests.authenticate_as('amir');
select is((select array_agg(user_id order by user_id) from public.flatmate_profiles where user_id <> tests.get_user_id('amir')),
  array[tests.get_user_id('zed')], 'a man who wants a male flatmate sees only compatible men');
select is((select count(*)::int from public.get_flatmate_matches()), 1, 'the match list has the same person');
select ok((select score between 50 and 100 from public.get_flatmate_matches()), 'with a compatibility score');
select throws_ok(
  $$ select public.send_flatmate_connection(tests.get_user_id('sara'), 'Hi') $$,
  'P0001', 'not_a_match', 'the gender filter cannot be bypassed with a direct request'
);
select tests.authenticate_as('sara');
select is((select array_agg(user_id order by user_id) from public.flatmate_profiles where user_id <> tests.get_user_id('sara')),
  array[tests.get_user_id('buddy_f')], 'a woman who wants a female flatmate sees only women');
select tests.authenticate_as('zed');
select is((select count(*)::int from public.flatmate_profiles where user_id <> tests.get_user_id('zed')), 2,
  'gender preference is checked both ways (a woman who wants women is hidden from an "any" man)');
select tests.authenticate_as('spammer');
select is_empty($$ select 1 from public.flatmate_profiles $$, 'a user without a flatmate profile sees no profiles');
select tests.authenticate_as_anon();
select throws_ok($$ select 1 from public.flatmate_profiles $$, '42501', null, 'signed-out visitors cannot read flatmate profiles');

-- Connections
select tests.authenticate_as('amir');
select lives_ok(
  $$ insert into ids select 'conn', public.send_flatmate_connection(tests.get_user_id('zed'), 'Shall we share a flat?') $$,
  'a user can send a connect request to a match'
);
select throws_ok($$ update public.flatmate_connections set status = 'accepted' $$, '42501', null,
  'the requester cannot accept their own connection');
select throws_ok(
  $$ select public.respond_flatmate_connection((select id from ids where key = 'conn'), true) $$,
  'P0002', 'connection_not_found', 'only the recipient can respond'
);
select tests.authenticate_as('zed');
select throws_ok(
  $$ select public.send_flatmate_connection(tests.get_user_id('amir')) $$,
  'P0001', 'already_connected', 'one live connection per pair'
);
select lives_ok(
  $$ insert into ids select 'conv_mate', public.respond_flatmate_connection((select id from ids where key = 'conn'), true) $$,
  'the recipient can accept'
);
select ok((select id is not null from ids where key = 'conv_mate'), 'accepting opens a conversation');
select tests.authenticate_as('sara');
select is_empty($$ select 1 from public.flatmate_connections $$, 'other users cannot see the connection');

-- A block hides the profile even with a connection
select tests.authenticate_as('amir');
insert into public.blocks (blocker_id, blocked_id) values (tests.get_user_id('amir'), tests.get_user_id('zed'));
select tests.authenticate_as('zed');
select is_empty($$ select 1 from public.flatmate_profiles where user_id = tests.get_user_id('amir') $$,
  'a blocked user no longer sees the profile');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ((select id from ids where key = 'conv_mate'), tests.get_user_id('zed'), 'Hi') $$,
  'P0001', 'blocked', 'and cannot message'
);

select * from finish();
rollback;
