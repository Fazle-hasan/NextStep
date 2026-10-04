-- Phase 3: mentor profiles and verification, availability and slots, booking, the 2-session limit,
-- overlap protection, feedback and ratings, private notes.
begin;
select no_plan();
select tests.clear_sample_data();

select tests.create_user('mentor', '910000000061');
select tests.create_user('mentee', '910000000062');
select tests.create_user('mentee2', '910000000063');
select tests.create_user('other', '910000000064');
select tests.create_user('root');
select tests.make_admin('root');
update public.profiles set onboarding_completed_at = now(), full_name = 'Test User', gender = 'male',
  city_id = (select id from public.cities where slug = 'mumbai');

create temp table ids (key text primary key, id uuid);
create temp table slots (n serial primary key, starts_at timestamptz);
grant all on ids, slots to authenticated, anon;
grant usage on sequence slots_n_seq to authenticated;

-- Mentor profile and verification ---------------------------------------------------
select tests.authenticate_as('mentor');
select lives_ok(
  $$ insert into public.mentor_profiles (user_id, headline, years_experience, session_types, default_duration_min)
     values (tests.get_user_id('mentor'), 'Senior backend engineer', 10, '{career_guidance,cv_review}', 30) $$,
  'a user can create their mentor profile'
);
select is((select verification_status::text from public.mentor_profiles), 'pending', 'a new mentor starts unverified');
select ok(public.has_role('mentor'), 'creating a mentor profile grants the mentor role');
select is((select count(*)::int from public.verification_requests where kind = 'mentor' and status = 'pending'),
  1, 'a verification request is opened');
select throws_ok(
  $$ update public.mentor_profiles set verification_status = 'approved' $$, '42501', null,
  'a mentor cannot verify themselves'
);
select throws_ok(
  $$ update public.mentor_profiles set rating_avg = 5, rating_count = 99 $$, '42501', null,
  'a mentor cannot edit their rating'
);
select throws_ok(
  $$ update public.mentor_profiles set timezone = 'Mars/Olympus' $$, '22023', 'invalid_timezone',
  'the time zone must be a real one'
);
select throws_ok(
  $$ insert into public.mentor_profiles (user_id, headline, years_experience)
     values (tests.get_user_id('other'), 'Impostor', 3) $$,
  '42501', null, 'a profile cannot be created for someone else'
);
select lives_ok(
  $$ insert into public.mentor_availability_rules (mentor_id, weekday, start_time, end_time)
     select tests.get_user_id('mentor'), d, '09:00', '12:00' from generate_series(0, 6) d $$,
  'a mentor can set weekly availability'
);

select tests.authenticate_as('mentee');
select is_empty($$ select 1 from public.mentor_profiles $$, 'an unverified mentor is not listed');
select is_empty(
  $$ select 1 from public.get_mentor_slots(tests.get_user_id('mentor'), current_date, current_date + 7) $$,
  'an unverified mentor has no bookable slots');
select throws_ok(
  $$ select public.book_session(tests.get_user_id('mentor'), 'career_guidance', now() + interval '2 days') $$,
  'P0001', 'mentor_not_available', 'an unverified mentor cannot be booked'
);

select tests.authenticate_as('root');
select lives_ok(
  $$ select public.admin_review_verification((select id from public.verification_requests where kind = 'mentor'), true) $$,
  'an admin can approve the mentor'
);
select is((select verification_status::text from public.mentor_profiles), 'approved', 'approval updates the mentor profile');

select tests.authenticate_as_anon();
select throws_ok($$ select 1 from public.mentor_profiles $$, '42501', null, 'signed-out visitors cannot read mentors');
select throws_ok($$ select 1 from public.mentorship_sessions $$, '42501', null, 'signed-out visitors cannot read sessions');

-- Slots and booking ------------------------------------------------------------------
select tests.authenticate_as('mentee');
select is((select count(*)::int from public.mentor_profiles), 1, 'a verified mentor is listed');
select is_empty($$ select 1 from public.mentor_availability_rules $$, 'availability rules are not readable by others');
insert into slots (starts_at)
  select starts_at from public.get_mentor_slots(tests.get_user_id('mentor'), current_date, current_date + 8);
select ok((select count(*) from slots) >= 30, 'free slots are generated from the weekly rules');
select ok((select min(starts_at) from slots) >= now() + interval '12 hours', 'slots start at least 12 hours ahead');
select ok(
  (select bool_and(extract(hour from starts_at at time zone 'Asia/Kolkata') between 9 and 11) from slots),
  'slots fall inside the mentor''s hours in the mentor''s time zone');

select throws_ok(
  $$ select public.book_session(tests.get_user_id('mentor'), 'mock_interview', (select starts_at from slots where n = 1)) $$,
  '22023', 'session_type_not_offered', 'only offered session types can be booked'
);
select throws_ok(
  $$ select public.book_session(tests.get_user_id('mentor'), 'cv_review', (select starts_at from slots where n = 1) + interval '7 minutes') $$,
  'P0001', 'slot_not_available', 'a time outside the mentor''s slots cannot be booked'
);
select lives_ok(
  $$ insert into ids select 's1', public.book_session(tests.get_user_id('mentor'), 'cv_review',
       (select starts_at from slots where n = 1), 'Please review my CV') $$,
  'a mentee can request a free slot'
);
select is((select status::text from public.mentorship_sessions), 'requested', 'a new session waits for the mentor');
select is_empty(
  $$ select 1 from public.get_mentor_slots(tests.get_user_id('mentor'), current_date, current_date + 8)
     where starts_at = (select starts_at from slots where n = 1) $$,
  'a requested slot is no longer offered');
select throws_ok(
  $$ update public.mentorship_sessions set status = 'confirmed', meeting_url = 'https://meet.example.test/x' $$,
  '42501', null, 'a mentee cannot confirm their own session'
);
select throws_ok(
  $$ insert into public.mentorship_sessions (mentor_id, mentee_id, session_type, starts_at, ends_at)
     values (tests.get_user_id('mentor'), tests.get_user_id('mentee'), 'cv_review', now() + interval '3 days',
             now() + interval '3 days 30 minutes') $$,
  '42501', null, 'sessions cannot be inserted directly'
);

select tests.authenticate_as('mentee2');
select throws_ok(
  $$ select public.book_session(tests.get_user_id('mentor'), 'cv_review', (select starts_at from slots where n = 1)) $$,
  'P0001', 'slot_not_available', 'a taken slot cannot be booked by someone else'
);
select is_empty($$ select 1 from public.mentorship_sessions $$, 'other users cannot see a session');

-- The overlap constraint itself (bypassing the RPC)
select tests.clear_authentication();
select throws_ok(
  $$ insert into public.mentorship_sessions (mentor_id, mentee_id, session_type, starts_at, ends_at)
     values (tests.get_user_id('mentor'), tests.get_user_id('mentee2'), 'cv_review',
             (select starts_at from slots where n = 1), (select starts_at from slots where n = 1) + interval '30 minutes') $$,
  '23P01', null, 'the database rejects overlapping sessions for a mentor'
);

-- Two upcoming sessions at most
select tests.authenticate_as('mentee');
select lives_ok(
  $$ insert into ids select 's2', public.book_session(tests.get_user_id('mentor'), 'career_guidance',
       (select starts_at from slots where n = 2)) $$,
  'a second upcoming session is allowed'
);
select throws_ok(
  $$ select public.book_session(tests.get_user_id('mentor'), 'career_guidance', (select starts_at from slots where n = 3)) $$,
  'P0001', 'session_limit_reached', 'a third upcoming session is refused'
);
select tests.authenticate_as('mentor');
select throws_ok(
  $$ select public.book_session(tests.get_user_id('mentor'), 'career_guidance', (select starts_at from slots where n = 3)) $$,
  'P0001', 'cannot_book_self', 'a mentor cannot book themselves'
);

-- Accept / decline / cancel ------------------------------------------------------------
select tests.authenticate_as('mentee');
select throws_ok(
  $$ select public.respond_to_session((select id from ids where key = 's1'), true, 'https://meet.example.test/abc') $$,
  'P0002', 'session_not_found', 'only the mentor can respond'
);
select tests.authenticate_as('mentor');
select is((select count(*)::int from public.mentorship_sessions), 2, 'the mentor sees their requests');
select throws_ok(
  $$ select public.respond_to_session((select id from ids where key = 's1'), true, 'http://not-secure.example.test') $$,
  '22023', 'invalid_meeting_url', 'accepting needs an https meeting link'
);
select lives_ok(
  $$ select public.respond_to_session((select id from ids where key = 's1'), true, 'https://meet.example.test/abc') $$,
  'the mentor can accept with a meeting link'
);
select lives_ok(
  $$ select public.respond_to_session((select id from ids where key = 's2'), false, null, 'Busy that day') $$,
  'the mentor can decline'
);
select tests.authenticate_as('mentee');
select is((select status::text from public.mentorship_sessions where id = (select id from ids where key = 's1')),
  'confirmed', 'the mentee sees the confirmation');
select lives_ok(
  $$ insert into ids select 's3', public.book_session(tests.get_user_id('mentor'), 'career_guidance',
       (select starts_at from slots where n = 3)) $$,
  'a declined session frees the limit'
);
select lives_ok($$ select public.cancel_session((select id from ids where key = 's3'), 'Change of plans') $$,
  'a mentee can cancel before the start');
select throws_ok(
  $$ select public.cancel_session((select id from ids where key = 's3')) $$,
  'P0001', 'session_not_cancellable', 'a cancelled session cannot be cancelled again'
);

-- Feedback and ratings ---------------------------------------------------------------
select throws_ok(
  $$ select public.submit_session_feedback((select id from ids where key = 's1'), 5::smallint, 'Great') $$,
  'P0001', 'session_not_finished', 'feedback opens after the session ends'
);
select tests.clear_authentication();
update public.mentorship_sessions
set starts_at = now() - interval '2 hours', ends_at = now() - interval '90 minutes'
where id = (select id from ids where key = 's1');

select tests.authenticate_as('mentee');
select throws_ok(
  $$ select public.submit_session_feedback((select id from ids where key = 's1')) $$,
  '22023', 'rating_required', 'the mentee must give a rating'
);
select lives_ok(
  $$ select public.submit_session_feedback((select id from ids where key = 's1'), 4::smallint, 'Very helpful') $$,
  'the mentee can rate the mentor'
);
select throws_ok(
  $$ select public.submit_session_feedback((select id from ids where key = 's1'), 5::smallint) $$,
  'P0001', 'feedback_already_given', 'feedback is given once'
);
select is((select status::text from public.mentorship_sessions where id = (select id from ids where key = 's1')),
  'completed', 'feedback completes the session');
select is((select rating_count from public.mentor_profiles), 1, 'the mentor''s rating count is updated');
select is((select rating_avg from public.mentor_profiles), 4.00, 'the mentor''s average rating is updated');
select throws_ok(
  $$ insert into public.session_feedback (session_id, author_id, author_side, rating)
     values ((select id from ids where key = 's1'), tests.get_user_id('mentee'), 'mentee', 5) $$,
  '42501', null, 'feedback cannot be inserted directly'
);

select tests.authenticate_as('mentor');
select lives_ok(
  $$ select public.submit_session_feedback((select id from ids where key = 's1'), null, 'Good progress', 'Practise system design') $$,
  'the mentor can add feedback and next steps'
);
select lives_ok(
  $$ insert into public.mentor_private_notes (session_id, mentor_id, body)
     values ((select id from ids where key = 's1'), tests.get_user_id('mentor'), 'Needs confidence') $$,
  'the mentor can keep a private note'
);

select tests.authenticate_as('mentee');
select is((select count(*)::int from public.session_feedback), 2, 'both sides see the feedback');
select is_empty($$ select 1 from public.mentor_private_notes $$, 'the mentee can never read the mentor''s private notes');
select throws_ok(
  $$ insert into public.mentor_private_notes (session_id, mentor_id, body)
     values ((select id from ids where key = 's1'), tests.get_user_id('mentee'), 'x') $$,
  '42501', null, 'a mentee cannot write notes on a session'
);
select tests.authenticate_as('other');
select is_empty($$ select 1 from public.session_feedback $$, 'outsiders cannot read feedback');
select tests.authenticate_as('root');
select is((select count(*)::int from public.mentorship_sessions), 3, 'an admin sees all sessions');

-- Exceptions and blocks ----------------------------------------------------------------
select tests.authenticate_as('mentor');
insert into public.mentor_availability_exceptions (mentor_id, on_date, kind)
values (tests.get_user_id('mentor'), current_date + 3, 'unavailable');
insert into public.blocks (blocker_id, blocked_id) values (tests.get_user_id('mentor'), tests.get_user_id('mentee2'));

select tests.authenticate_as('other');
select is_empty(
  $$ select 1 from public.get_mentor_slots(tests.get_user_id('mentor'), current_date + 3, current_date + 3) $$,
  'an unavailable day has no slots');
select ok(
  (select count(*) from public.get_mentor_slots(tests.get_user_id('mentor'), current_date + 4, current_date + 4)) > 0,
  'the next day still has slots');

select tests.authenticate_as('mentee2');
select is_empty($$ select 1 from public.mentor_profiles $$, 'a blocked user does not see the mentor');
select throws_ok(
  $$ select public.book_session(tests.get_user_id('mentor'), 'cv_review', (select starts_at from slots where n = 10)) $$,
  'P0001', 'mentor_not_available', 'a blocked user cannot book the mentor'
);

select * from finish();
rollback;
