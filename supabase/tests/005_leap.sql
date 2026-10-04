-- Phase 3: LEAP programs, enrollments (capacity, waitlist, approval), completion and badges.
begin;
select no_plan();
select tests.clear_sample_data();

select tests.create_user('u1', '910000000051');
select tests.create_user('u2', '910000000052');
select tests.create_user('u3', '910000000053');
select tests.create_user('newbie', '910000000054');   -- has not finished onboarding
select tests.create_user('root');
select tests.make_admin('root');
update public.profiles set onboarding_completed_at = now(), full_name = 'Test User', gender = 'male',
  city_id = (select id from public.cities where slug = 'mumbai')
where id <> tests.get_user_id('newbie');

create temp table ids (key text primary key, id uuid);
grant all on ids to authenticated, anon;

-- Programs are admin-managed ------------------------------------------------------
select tests.authenticate_as('u1');
select throws_ok(
  $$ insert into public.leap_programs (title, slug, description, program_type, mode, start_date, end_date, badge_name, created_by)
     values ('Sneaky', 'sneaky', 'x', 'workshop', 'online', current_date + 5, current_date + 6, 'Sneaky', tests.get_user_id('u1')) $$,
  '42501', null, 'a normal user cannot create a program'
);

select tests.authenticate_as('root');
select lives_ok(
  $$ with p as (
       insert into public.leap_programs (title, slug, description, program_type, mode, start_date, end_date,
         capacity, status, badge_name, created_by)
       values ('Python Sprint', 'python-sprint', 'Four weeks of Python', 'training_course', 'online',
         current_date + 5, current_date + 33, 1, 'open', 'LEAP Python Sprint', tests.get_user_id('root'))
       returning id)
     insert into ids select 'open', id from p $$,
  'an admin can create an open program'
);
select lives_ok(
  $$ with p as (
       insert into public.leap_programs (title, slug, description, program_type, mode, city_id, start_date, end_date,
         capacity, requires_approval, status, badge_name, created_by)
       values ('Mumbai Cohort', 'mumbai-cohort', 'Selective cohort', 'cohort', 'in_person',
         (select id from public.cities where slug = 'mumbai'), current_date + 10, current_date + 70, 1, true, 'open',
         'LEAP Mumbai Cohort', tests.get_user_id('root'))
       returning id)
     insert into ids select 'approval', id from p $$,
  'an admin can create a program that needs approval'
);
select lives_ok(
  $$ with p as (
       insert into public.leap_programs (title, slug, description, program_type, mode, start_date, end_date, badge_name, created_by)
       values ('Draft Workshop', 'draft-workshop', 'Not ready', 'workshop', 'online', current_date + 5, current_date + 5,
         'Draft', tests.get_user_id('root'))
       returning id)
     insert into ids select 'draft', id from p $$,
  'an admin can create a draft'
);
select throws_ok(
  $$ insert into public.leap_programs (title, slug, description, program_type, mode, start_date, end_date, badge_name, created_by)
     values ('No City', 'no-city', 'x', 'workshop', 'in_person', current_date + 5, current_date + 5, 'x', tests.get_user_id('root')) $$,
  '23514', null, 'an in-person program needs a city'
);
select is((select count(*)::int from public.leap_programs), 3, 'an admin sees drafts too');
select ok((select count(*) from public.audit_log where target_table = 'leap_programs') >= 3, 'program changes are audited');

-- Public visibility ---------------------------------------------------------------
select tests.authenticate_as_anon();
select is((select count(*)::int from public.leap_programs), 2, 'the public sees programs except drafts');
select throws_ok($$ select 1 from public.leap_enrollments $$, '42501', null, 'the public cannot read enrollments');
select throws_ok($$ select 1 from public.leap_badges $$, '42501', null, 'the public cannot read badges');
select throws_ok(
  $$ select public.enroll_in_program((select id from ids where key = 'open')) $$,
  '42501', null, 'signed-out visitors cannot enroll'
);

-- Enrollment: capacity and waitlist ----------------------------------------------------
select tests.authenticate_as('newbie');
select throws_ok(
  $$ select public.enroll_in_program((select id from ids where key = 'open')) $$,
  'P0001', 'onboarding_required', 'onboarding must be finished before enrolling'
);

select tests.authenticate_as('u1');
select is((select count(*)::int from public.leap_programs), 2, 'signed-in users do not see drafts');
select throws_ok(
  $$ select public.enroll_in_program((select id from ids where key = 'draft')) $$,
  'P0001', 'program_not_open', 'a draft program cannot be joined'
);
select is(public.enroll_in_program((select id from ids where key = 'open'), 'I want to learn')::text,
  'enrolled', 'the first user gets the seat');
select throws_ok(
  $$ select public.enroll_in_program((select id from ids where key = 'open')) $$,
  'P0001', 'already_enrolled', 'a user cannot enroll twice'
);
select throws_ok(
  $$ update public.leap_enrollments set status = 'completed' $$,
  '42501', null, 'a user cannot edit their enrollment status directly'
);
select throws_ok(
  $$ insert into public.leap_enrollments (program_id, user_id, status)
     values ((select id from ids where key = 'approval'), tests.get_user_id('u1'), 'enrolled') $$,
  '42501', null, 'enrollments cannot be inserted directly'
);
select throws_ok(
  $$ insert into public.leap_badges (user_id, program_id)
     values (tests.get_user_id('u1'), (select id from ids where key = 'open')) $$,
  '42501', null, 'a user cannot award themselves a badge'
);
update public.leap_programs set capacity = 100;
select is((select capacity from public.leap_programs where id = (select id from ids where key = 'open')),
  1, 'a user cannot change a program');

select tests.authenticate_as('u2');
select is(public.enroll_in_program((select id from ids where key = 'open'))::text,
  'waitlisted', 'when the program is full the next user is waitlisted');
select is((select seats_taken from public.leap_programs where id = (select id from ids where key = 'open')),
  1, 'seats_taken counts enrolled users only');
select is((select count(*)::int from public.leap_enrollments), 1, 'a user sees only their own enrollment');
select throws_ok(
  $$ select public.cancel_enrollment((select e.id from public.leap_enrollments e
       where e.user_id = tests.get_user_id('u1'))) $$,
  'P0002', 'enrollment_not_found', 'a user cannot cancel someone else''s enrollment'
);

-- Cancelling frees the seat for the waitlist
select tests.authenticate_as('u1');
select lives_ok(
  $$ select public.cancel_enrollment((select id from public.leap_enrollments
       where program_id = (select id from ids where key = 'open'))) $$,
  'a user can cancel their own enrollment'
);
select tests.authenticate_as('u2');
select is((select status::text from public.leap_enrollments where program_id = (select id from ids where key = 'open')),
  'enrolled', 'the oldest waitlisted user is promoted when a seat frees up');

select tests.authenticate_as('u1');
select is(public.enroll_in_program((select id from ids where key = 'open'))::text,
  'waitlisted', 'a user who cancelled can enroll again and joins the waitlist');

-- Raising capacity promotes the waitlist
select tests.authenticate_as('root');
update public.leap_programs set capacity = 2 where id = (select id from ids where key = 'open');
select is((select count(*)::int from public.leap_enrollments
           where program_id = (select id from ids where key = 'open') and status = 'enrolled'),
  2, 'raising capacity promotes waitlisted users');
select is((select count(*)::int from public.leap_enrollments), 2, 'an admin sees all enrollments');

-- Approval flow (D-009) -------------------------------------------------------------
select tests.authenticate_as('u1');
select is(public.enroll_in_program((select id from ids where key = 'approval'), 'Please pick me')::text,
  'pending', 'a program that needs approval starts as pending');
select throws_ok(
  $$ select public.admin_decide_enrollment((select id from public.leap_enrollments where status = 'pending'), true) $$,
  '42501', 'admin_only', 'a user cannot approve their own enrollment'
);
select throws_ok(
  $$ select public.admin_complete_enrollment((select id from public.leap_enrollments where status = 'enrolled')) $$,
  '42501', 'admin_only', 'a user cannot complete their own enrollment'
);
select tests.authenticate_as('u2');
select is(public.enroll_in_program((select id from ids where key = 'approval'))::text, 'pending', 'second applicant is pending');
select tests.authenticate_as('u3');
select is(public.enroll_in_program((select id from ids where key = 'approval'))::text, 'pending', 'third applicant is pending');

select tests.authenticate_as('root');
select is(
  public.admin_decide_enrollment((select id from public.leap_enrollments
    where program_id = (select id from ids where key = 'approval') and user_id = tests.get_user_id('u1')), true)::text,
  'enrolled', 'an approved applicant takes a free seat');
select is(
  public.admin_decide_enrollment((select id from public.leap_enrollments
    where program_id = (select id from ids where key = 'approval') and user_id = tests.get_user_id('u2')), true)::text,
  'waitlisted', 'an approved applicant is waitlisted when the program is full');
select is(
  public.admin_decide_enrollment((select id from public.leap_enrollments
    where program_id = (select id from ids where key = 'approval') and user_id = tests.get_user_id('u3')), false, 'Not eligible yet')::text,
  'rejected', 'an admin can reject with a reason');
select throws_ok(
  $$ select public.admin_decide_enrollment((select id from public.leap_enrollments
       where program_id = (select id from ids where key = 'approval') and user_id = tests.get_user_id('u3')), true) $$,
  'P0001', 'enrollment_already_decided', 'a rejected enrollment cannot be decided again'
);
select ok((select count(*) from public.audit_log where action in ('enrollment_approved', 'enrollment_rejected')) = 3,
  'enrollment decisions are audited');

select tests.authenticate_as('u3');
select throws_ok(
  $$ select public.enroll_in_program((select id from ids where key = 'approval')) $$,
  'P0001', 'enrollment_rejected', 'a rejected user cannot re-enroll'
);
select is((select decision_reason from public.leap_enrollments), 'Not eligible yet', 'the user sees the rejection reason');

-- Completion and badges --------------------------------------------------------------
select tests.authenticate_as('root');
select throws_ok(
  $$ select public.admin_complete_enrollment((select id from public.leap_enrollments where status = 'waitlisted')) $$,
  'P0001', 'not_enrolled', 'only enrolled participants can be completed'
);
select lives_ok(
  $$ select public.admin_complete_enrollment((select id from public.leap_enrollments
       where program_id = (select id from ids where key = 'open') and user_id = tests.get_user_id('u1'))) $$,
  'an admin can mark an enrollment completed'
);
select is((select count(*)::int from public.leap_badges where user_id = tests.get_user_id('u1')), 1, 'completion awards the badge');
select is((select seats_taken from public.leap_programs where id = (select id from ids where key = 'open')),
  2, 'a completed participant still holds their seat');
select throws_ok(
  $$ update public.leap_programs set status = 'draft' where id = (select id from ids where key = 'open') $$,
  'P0001', 'program_has_enrollments', 'a program with enrollments cannot go back to draft'
);
delete from public.leap_programs where id = (select id from ids where key = 'open');
select is((select count(*)::int from public.leap_programs where id = (select id from ids where key = 'open')),
  1, 'only draft programs can be deleted');

-- Badges are visible to signed-in users (employers filter applicants by them), unless blocked
select tests.authenticate_as('u2');
select is((select count(*)::int from public.leap_badges where user_id = tests.get_user_id('u1')), 1,
  'other signed-in users can see a badge');
select is_empty($$ select 1 from public.leap_enrollments where user_id = tests.get_user_id('u1') $$,
  'but not the other user''s enrollments');

select tests.authenticate_as('u1');
insert into public.blocks (blocker_id, blocked_id) values (tests.get_user_id('u1'), tests.get_user_id('u3'));
select tests.authenticate_as('u3');
select is_empty($$ select 1 from public.leap_badges where user_id = tests.get_user_id('u1') $$,
  'a blocked user cannot see the badge');
select tests.authenticate_as('u2');
delete from public.leap_badges;
select is((select count(*)::int from public.leap_badges), 1, 'a user cannot delete badges');

-- Closed programs ---------------------------------------------------------------------
select tests.authenticate_as('root');
update public.leap_programs set status = 'closed' where id = (select id from ids where key = 'approval');
select tests.authenticate_as('u3');
select is((select count(*)::int from public.leap_programs where id = (select id from ids where key = 'approval')), 1,
  'a closed program stays visible');
select throws_ok(
  $$ select public.enroll_in_program((select id from ids where key = 'approval')) $$,
  'P0001', 'program_not_open', 'a closed program cannot be joined'
);

select * from finish();
rollback;
