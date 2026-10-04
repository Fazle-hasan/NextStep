-- Phase 6: notifications and preferences, moderation actions, suspension, place suggestion review,
-- flat-lister ID badge, analytics, job-alert digest.
begin;
select no_plan();
select tests.clear_sample_data();
delete from public.notifications;

select tests.create_user('alice', '910000000091');
select tests.create_user('bob', '910000000092');
select tests.create_user('carol', '910000000093');
select tests.create_user('root');
select tests.create_user('root2');
select tests.make_admin('root');
select tests.make_admin('root2');
update public.profiles set onboarding_completed_at = now(), full_name = 'Test User', gender = 'male',
  city_id = (select id from public.cities where slug = 'mumbai');

create temp table ids (key text primary key, id uuid);
grant all on ids to authenticated, anon;

-- ============================ NOTIFICATIONS ============================
-- Events create notifications: a flat contact request and its acceptance.
select tests.clear_authentication();
with l as (
  insert into public.flat_listings (lister_id, listing_type, city_id, title, rent, available_from, status)
  values (tests.get_user_id('alice'), 'private_room', (select id from public.cities where slug = 'mumbai'),
          'Room for notification tests', 1000000, current_date, 'active')
  returning id)
insert into ids select 'flat', id from l;

select tests.authenticate_as('bob');
insert into ids select 'req', public.send_contact_request((select id from ids where key = 'flat'), 'Hello, is it available?');
select is_empty($$ select 1 from public.notifications $$, 'a user cannot see someone else''s notification');

select tests.authenticate_as('alice');
select is((select count(*)::int from public.notifications where type = 'contact_request'), 1,
  'the lister is notified about a new contact request');
select is((select email_status::text from public.notifications where type = 'contact_request'), 'pending',
  'email is queued by default');
select throws_ok(
  $$ insert into public.notifications (user_id, type, title) values (tests.get_user_id('bob'), 'x', 'Forged') $$,
  '42501', null, 'a user cannot create notifications'
);
select throws_ok($$ update public.notifications set title = 'Edited' $$, '42501', null, 'a user cannot edit a notification');
select throws_ok($$ select private.notify(tests.get_user_id('bob'), 'x', 'Forged') $$, '42501', null,
  'notify() is not callable by users');

-- Preferences: muting a type skips its email
select lives_ok(
  $$ insert into public.notification_preferences (user_id, email_enabled, email_muted_types)
     values (tests.get_user_id('alice'), true, '{new_message}') $$,
  'a user can save notification preferences'
);
select throws_ok(
  $$ insert into public.notification_preferences (user_id) values (tests.get_user_id('bob')) $$,
  '42501', null, 'preferences cannot be created for someone else'
);
insert into ids select 'conv', public.respond_contact_request((select id from ids where key = 'req'), true);

select tests.authenticate_as('bob');
select is((select count(*)::int from public.notifications where type = 'contact_decided'), 1,
  'the requester is notified when the request is accepted');
select is_empty($$ select 1 from public.notification_preferences $$, 'preferences are private');
insert into public.messages (conversation_id, sender_id, body)
values ((select id from ids where key = 'conv'), tests.get_user_id('bob'), 'First message'),
       ((select id from ids where key = 'conv'), tests.get_user_id('bob'), 'Second message');

select tests.authenticate_as('alice');
select is((select count(*)::int from public.notifications where type = 'new_message'), 1,
  'a burst of chat messages gives one notification while it is unread');
select is((select email_status::text from public.notifications where type = 'new_message'), 'skipped',
  'a muted type is not emailed');
select is(public.mark_notifications_read(), 2, 'mark all read returns the number marked');
select is((select count(*)::int from public.notifications where read_at is null), 0, 'everything is read');
select lives_ok($$ delete from public.notifications where type = 'new_message' $$, 'a user can delete their notification');

select tests.authenticate_as('bob');
select is(public.mark_notifications_read(array(select id from public.notifications)), 1, 'mark selected as read');
select tests.authenticate_as_anon();
select throws_ok($$ select 1 from public.notifications $$, '42501', null, 'signed-out visitors cannot read notifications');

-- Email switched off entirely
select tests.authenticate_as('bob');
insert into public.notification_preferences (user_id, email_enabled) values (tests.get_user_id('bob'), false);
select tests.authenticate_as('alice');
insert into public.messages (conversation_id, sender_id, body)
values ((select id from ids where key = 'conv'), tests.get_user_id('alice'), 'Reply');
select tests.authenticate_as('bob');
select is((select email_status::text from public.notifications where type = 'new_message'), 'skipped',
  'with email off, nothing is queued');

-- ============================ FLAT-LISTER ID BADGE ============================
select tests.authenticate_as('carol');
select throws_ok($$ select public.request_lister_verification() $$, 'P0001', 'not_a_lister',
  'only listers can ask for the ID badge');
select tests.authenticate_as('alice');
select tests.clear_authentication();
insert into public.user_roles (user_id, role) values (tests.get_user_id('alice'), 'flat_lister') on conflict do nothing;
select tests.authenticate_as('alice');
select lives_ok($$ select public.request_lister_verification('ID attached') $$, 'a lister can ask for the ID badge');
select throws_ok($$ select public.request_lister_verification() $$, 'P0001', 'already_requested', 'only one pending request');
select throws_ok($$ update public.profiles set lister_verified_at = now() $$, '42501', null,
  'a user cannot give themselves the badge');
select tests.authenticate_as('root');
select public.admin_review_verification(id, true) from public.verification_requests where kind = 'flat_lister_id';
select ok((select lister_verified_at is not null from public.profiles where id = tests.get_user_id('alice')),
  'approval grants the ID badge');
select tests.authenticate_as('alice');
select is((select count(*)::int from public.notifications where type = 'verification_decided'), 1,
  'the user is notified of the decision');

-- ============================ MODERATION ============================
-- Bob reports Alice's listing, Alice as a user, and Alice's message.
select tests.authenticate_as('bob');
insert into public.reports (reporter_id, target_type, target_id, reason, details)
values (tests.get_user_id('bob'), 'flat_listing', (select id from ids where key = 'flat'), 'fraud', 'Looks fake'),
       (tests.get_user_id('bob'), 'user', tests.get_user_id('alice'), 'harassment', null),
       (tests.get_user_id('bob'), 'message', (select id from public.messages where sender_id = tests.get_user_id('alice') limit 1), 'spam', null);
select throws_ok(
  $$ select public.admin_resolve_report((select id from public.reports limit 1), 'dismiss') $$,
  '42501', 'admin_only', 'a user cannot resolve reports'
);
select throws_ok($$ update public.reports set status = 'dismissed' $$, '42501', null, 'nor edit them directly');
select throws_ok(
  $$ select public.admin_set_user_suspension(tests.get_user_id('alice'), true, 'Because') $$,
  '42501', 'admin_only', 'a user cannot suspend anyone'
);
select throws_ok(
  $$ select public.admin_set_content_hidden('flat_listing', (select id from ids where key = 'flat'), true) $$,
  '42501', 'admin_only', 'a user cannot hide content'
);
select throws_ok($$ select public.admin_analytics() $$, '42501', 'admin_only', 'analytics is admin-only');
select throws_ok(
  $$ select public.admin_review_place_suggestion(gen_random_uuid(), true) $$,
  '42501', 'admin_only', 'a user cannot review place suggestions'
);
select throws_ok($$ select public.run_job_alert_digest() $$, '42501', null, 'a user cannot run the digest');
select is_empty($$ select 1 from public.audit_log $$, 'a user cannot read the audit log');

select tests.authenticate_as('root');
select is((select count(*)::int from public.reports where status = 'open'), 3, 'an admin sees the open reports');
select throws_ok(
  $$ select public.admin_resolve_report((select id from public.reports where target_type = 'flat_listing'), 'explode') $$,
  '22023', 'invalid_action', 'only known actions are accepted'
);
select throws_ok(
  $$ select public.admin_resolve_report((select id from public.reports where target_type = 'user'), 'hide') $$,
  'P0001', 'cannot_hide_user', 'a user cannot be hidden, only suspended'
);
select throws_ok(
  $$ select public.admin_resolve_report((select id from public.reports where target_type = 'user'), 'warn') $$,
  '22023', 'note_required', 'a warning needs a note'
);

-- hide
select lives_ok(
  $$ select public.admin_resolve_report((select id from public.reports where target_type = 'flat_listing'), 'hide', 'Fake listing') $$,
  'an admin can hide reported content'
);
select ok((select hidden_at is not null from public.flat_listings where id = (select id from ids where key = 'flat')),
  'the listing is hidden');
select is((select status::text from public.reports where target_type = 'flat_listing'), 'actioned', 'the report is marked actioned');
select throws_ok(
  $$ select public.admin_resolve_report((select id from public.reports where target_type = 'flat_listing'), 'dismiss') $$,
  'P0001', 'report_already_resolved', 'a report is resolved once'
);
select tests.authenticate_as('carol');
select is_empty($$ select 1 from public.flat_listings $$, 'a hidden listing is gone for other users');

-- warn
select tests.authenticate_as('root');
select lives_ok(
  $$ select public.admin_resolve_report((select id from public.reports where target_type = 'message'), 'warn', 'Please keep chats respectful.') $$,
  'an admin can warn the author'
);
select tests.authenticate_as('alice');
select is((select body from public.notifications where type = 'moderation_warning'), 'Please keep chats respectful.',
  'the warned user receives the note');

-- restore content outside a report
select tests.authenticate_as('root');
select lives_ok(
  $$ select public.admin_set_content_hidden('flat_listing', (select id from ids where key = 'flat'), false) $$,
  'an admin can restore hidden content'
);
select tests.authenticate_as('carol');
select is((select count(*)::int from public.flat_listings), 1, 'the restored listing is visible again');

-- suspend
select tests.authenticate_as('root');
select throws_ok(
  $$ select public.admin_set_user_suspension(tests.get_user_id('root'), true, 'Me') $$,
  'P0001', 'cannot_suspend_self', 'an admin cannot suspend themselves'
);
select throws_ok(
  $$ select public.admin_set_user_suspension(tests.get_user_id('root2'), true, 'Another admin') $$,
  'P0001', 'cannot_suspend_admin', 'admins cannot be suspended'
);
select lives_ok(
  $$ select public.admin_resolve_report((select id from public.reports where target_type = 'user'), 'suspend', 'Repeated harassment') $$,
  'an admin can suspend a reported user'
);
select ok((select suspended_at is not null from public.profiles where id = tests.get_user_id('alice')), 'the account is suspended');
select tests.authenticate_as('carol');
select is_empty($$ select 1 from public.flat_listings $$, 'a suspended lister''s listings are hidden');
select is_empty($$ select 1 from public.profiles where id = tests.get_user_id('alice') $$, 'and so is their profile');
select tests.authenticate_as('alice');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ((select id from ids where key = 'conv'), tests.get_user_id('alice'), 'Still here') $$,
  'P0001', 'account_suspended', 'a suspended user cannot message'
);
-- Suspension also hides the user's companies (and so their jobs) and stops them posting jobs
select tests.clear_authentication();
insert into public.companies (id, owner_id, name, slug, verification_status, verified_at)
values (gen_random_uuid(), tests.get_user_id('bob'), 'Bob Traders', 'bob-traders', 'approved', now());
insert into public.company_members (company_id, user_id, member_role)
select id, owner_id, 'owner' from public.companies where slug = 'bob-traders';
insert into public.jobs (company_id, posted_by, title, description, job_type, work_mode, experience_level, city_id, status, published_at)
select id, owner_id, 'Shop Assistant', 'Test job', 'full_time', 'onsite', 'entry',
       (select id from public.cities where slug = 'mumbai'), 'published', now()
from public.companies where slug = 'bob-traders';
select tests.authenticate_as_anon();
select is((select count(*)::int from public.jobs where title = 'Shop Assistant'), 1, 'the job is public before the suspension');
select tests.authenticate_as('root');
select lives_ok($$ select public.admin_set_user_suspension(tests.get_user_id('bob'), true, 'Scam reports') $$,
  'an admin can suspend a user directly');
select tests.authenticate_as_anon();
select is_empty($$ select 1 from public.jobs where title = 'Shop Assistant' $$, 'a suspended employer''s jobs leave the public site');
select is_empty($$ select 1 from public.companies where slug = 'bob-traders' $$, 'and so does their company');
select is_empty($$ select 1 from public.search_jobs(p_q => 'shop assistant') $$, 'and job search');
select tests.authenticate_as('bob');
select throws_ok(
  $$ insert into public.jobs (company_id, posted_by, title, description, job_type, work_mode, experience_level, city_id)
     values ((select id from public.companies where slug = 'bob-traders'), tests.get_user_id('bob'), 'Another Job', 'x',
             'full_time', 'onsite', 'entry', (select id from public.cities where slug = 'mumbai')) $$,
  '42501', null, 'a suspended employer cannot post jobs'
);
select tests.authenticate_as('root');
select lives_ok($$ select public.admin_set_user_suspension(tests.get_user_id('bob'), false) $$, 'and the suspension can be lifted');

select tests.authenticate_as('root');
select lives_ok($$ select public.admin_set_user_suspension(tests.get_user_id('alice'), false) $$, 'an admin can lift a suspension');
select ok((select suspended_at is null from public.profiles where id = tests.get_user_id('alice')), 'the account is restored');
select ok(
  (select count(*) from public.audit_log
   where action in ('report_hide', 'report_warn', 'report_suspend', 'user_suspended', 'user_unsuspended', 'content_restored')) = 8,
  'every moderation action is in the audit log');

-- ============================ PLACE SUGGESTIONS ============================
select tests.authenticate_as('carol');
insert into public.place_suggestions (user_id, payload)
values (tests.get_user_id('carol'), jsonb_build_object('name', 'Suggested Imambargah', 'place_type', 'imambargah',
  'city_id', (select id from public.cities where slug = 'mumbai'), 'timings', 'Daily', 'lat', 19.07, 'lng', 72.88));
insert into public.place_suggestions (user_id, payload)
values (tests.get_user_id('carol'), jsonb_build_object('name', 'No Pin Grocery', 'place_type', 'halal_grocery',
  'city_id', (select id from public.cities where slug = 'mumbai')));
insert into public.place_suggestions (user_id, payload) values (tests.get_user_id('carol'), '{"name": "Incomplete"}');

select tests.authenticate_as('root');
select lives_ok(
  $$ insert into ids select 'place', public.admin_review_place_suggestion(
       (select id from public.place_suggestions where payload ->> 'name' = 'Suggested Imambargah'), true, 'Thanks') $$,
  'approving a new-place suggestion works'
);
select ok((select is_verified from public.places where id = (select id from ids where key = 'place')),
  'and creates a verified place');
select lives_ok(
  $$ select public.admin_review_place_suggestion(
       (select id from public.place_suggestions where payload ->> 'name' = 'No Pin Grocery'), true) $$,
  'a suggestion without a pin falls back to the city centre'
);
select throws_ok(
  $$ select public.admin_review_place_suggestion(
       (select id from public.place_suggestions where payload ->> 'name' = 'Incomplete'), true) $$,
  'P0001', 'suggestion_incomplete', 'an incomplete suggestion cannot be approved'
);
select lives_ok(
  $$ select public.admin_review_place_suggestion(
       (select id from public.place_suggestions where payload ->> 'name' = 'Incomplete'), false, 'Not enough detail') $$,
  'but can be rejected'
);
select throws_ok(
  $$ select public.admin_review_place_suggestion(
       (select id from public.place_suggestions where payload ->> 'name' = 'Incomplete'), true) $$,
  'P0001', 'suggestion_already_decided', 'a suggestion is decided once'
);

-- a correction
select tests.authenticate_as('carol');
insert into public.place_suggestions (user_id, place_id, payload)
values (tests.get_user_id('carol'), (select id from ids where key = 'place'), '{"timings": "Majlis on Thursdays"}');
select is((select count(*)::int from public.notifications where type = 'suggestion_decided'), 3,
  'the author is notified of each decision');
select tests.authenticate_as('root');
select public.admin_review_place_suggestion((select id from public.place_suggestions where status = 'pending'), true);
select is((select timings from public.places where id = (select id from ids where key = 'place')), 'Majlis on Thursdays',
  'approving a correction updates the place');
select is((select name from public.places where id = (select id from ids where key = 'place')), 'Suggested Imambargah',
  'and leaves the other fields alone');

-- ============================ ANALYTICS ============================
select ok((public.admin_analytics() ->> 'signups')::int >= 5, 'analytics counts signups in the default range');
select is(jsonb_typeof(public.admin_analytics() -> 'by_city'), 'array', 'with a per-city breakdown');
select is((public.admin_analytics(p_city_id => (select id from public.cities where slug = 'mumbai')) ->> 'listings_created')::int, 1,
  'and filters by city');
select throws_ok($$ select public.admin_analytics(current_date, current_date - 5) $$, '22023', 'invalid_range',
  'the date range must be valid');

-- ============================ JOB ALERT DIGEST ============================
select tests.clear_authentication();
insert into public.companies (id, owner_id, name, slug, verification_status, verified_at)
values (gen_random_uuid(), tests.get_user_id('carol'), 'Digest Co', 'digest-co', 'approved', now());
insert into public.jobs (company_id, posted_by, title, description, job_type, work_mode, experience_level, city_id, status, published_at)
select c.id, tests.get_user_id('carol'), t.title, 'Test job', 'full_time', 'onsite', 'mid',
       (select id from public.cities where slug = 'mumbai'), 'published', now()
from public.companies c, (values ('Python Developer'), ('Accountant')) as t (title)
where c.slug = 'digest-co';
insert into public.saved_searches (user_id, name, filters, alert_frequency, last_alerted_at)
values (tests.get_user_id('bob'), 'Python jobs', '{"q": "python", "types": ["full_time"]}', 'daily', now() - interval '1 day'),
       (tests.get_user_id('bob'), 'Not daily', '{"q": "python"}', 'none', now() - interval '1 day'),
       (tests.get_user_id('bob'), 'Nothing new', '{"q": "plumber"}', 'daily', now() - interval '1 day');
select is(private.create_job_alert_digests(), 1, 'one digest is created for the daily search with new matches');
select is((select title from public.notifications where type = 'job_alert'), '1 new job for "Python jobs"',
  'the digest names the saved search');
select is(private.create_job_alert_digests(), 0, 'running it again sends nothing new');

select * from finish();
rollback;
