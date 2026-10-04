-- Phase 2: companies, jobs, applications, pipeline, referrals, saved jobs, CV storage.
begin;
select no_plan();
select tests.clear_sample_data();

select tests.create_user('owner', '910000000041');     -- employer, Acme
select tests.create_user('owner2', '910000000042');    -- employer, Beta (a different company)
select tests.create_user('seeker', '910000000043');
select tests.create_user('seeker2', '910000000044');
select tests.create_user('referrer', '910000000045');
select tests.create_user('root');
select tests.make_admin('root');
update public.profiles set onboarding_completed_at = now(), full_name = 'Test User', gender = 'male',
  city_id = (select id from public.cities where slug = 'mumbai');

create temp table ids (key text primary key, id uuid);
grant all on ids to authenticated, anon;

-- Companies -------------------------------------------------------------------
select tests.authenticate_as('owner');
select lives_ok(
  $$ insert into ids select 'acme', public.create_company('Acme Test Ltd', 'Software', 's11_50', 'https://acme.example.test', 'Fake company') $$,
  'a signed-in user can register a company'
);
select is((select verification_status::text from public.companies where id = (select id from ids where key = 'acme')),
  'pending', 'a new company starts unverified');
select ok(public.is_company_member((select id from ids where key = 'acme')), 'the creator becomes a company member');
select ok(public.has_role('employer'), 'the creator gets the employer role');
select is((select count(*)::int from public.verification_requests where kind = 'company' and status = 'pending'),
  1, 'a verification request is opened');
select throws_ok(
  $$ update public.companies set verification_status = 'approved' $$, '42501', null,
  'the owner cannot verify their own company'
);
select throws_ok(
  $$ insert into public.companies (owner_id, name, slug) values (tests.get_user_id('owner'), 'Direct', 'direct') $$,
  '42501', null, 'companies cannot be inserted directly'
);
select lives_ok($$ update public.companies set description = 'Updated' $$, 'the owner can edit company details');

-- Jobs: an unverified company cannot publish ---------------------------------------
select throws_ok(
  $$ insert into public.jobs (company_id, posted_by, title, description, job_type, work_mode, experience_level, city_id, status)
     values ((select id from ids where key = 'acme'), tests.get_user_id('owner'), 'Sneaky Job', 'x', 'full_time', 'onsite', 'mid',
             (select id from public.cities where slug = 'mumbai'), 'published') $$,
  'P0001', 'job_must_start_as_draft', 'a job cannot be created already published'
);
select lives_ok(
  $$ with j as (
       insert into public.jobs (company_id, posted_by, title, description, job_type, work_mode, experience_level, city_id)
       values ((select id from ids where key = 'acme'), tests.get_user_id('owner'), 'Backend Engineer', 'Build Django APIs',
               'full_time', 'hybrid', 'mid', (select id from public.cities where slug = 'mumbai'))
       returning id)
     insert into ids select 'job1', id from j $$,
  'a company member can create a draft job'
);
select ok((select location is not null from public.jobs where id = (select id from ids where key = 'job1')),
  'the job location defaults to the city centre');
select throws_ok(
  $$ update public.jobs set status = 'published' where id = (select id from ids where key = 'job1') $$,
  'P0001', 'company_not_verified', 'an unverified company cannot publish a job'
);

select tests.authenticate_as_anon();
select is_empty($$ select 1 from public.companies $$, 'the public cannot see an unverified company');
select is_empty($$ select 1 from public.jobs $$, 'the public cannot see draft jobs');

select tests.authenticate_as('seeker');
select is_empty($$ select 1 from public.companies $$, 'other users cannot see an unverified company');
select throws_ok(
  $$ select public.admin_review_verification((select id from public.verification_requests limit 1), true) $$,
  '42501', 'admin_only', 'non-admins cannot review verification'
);
select throws_ok(
  $$ insert into public.jobs (company_id, posted_by, title, description, job_type, work_mode, experience_level, city_id)
     values ((select id from ids where key = 'acme'), tests.get_user_id('seeker'), 'Fake Job', 'x', 'full_time', 'onsite', 'mid',
             (select id from public.cities where slug = 'mumbai')) $$,
  '42501', null, 'non-members cannot post jobs for a company'
);

-- Admin verifies the company; the first job needs review -----------------------------
select tests.authenticate_as('root');
select lives_ok(
  $$ select public.admin_review_verification((select id from public.verification_requests where kind = 'company'), true) $$,
  'an admin can approve the company'
);
select is((select count(*)::int from public.audit_log where action = 'verification_approved'), 1, 'the approval is audited');

select tests.authenticate_as('owner');
update public.jobs set status = 'published' where id = (select id from ids where key = 'job1');
select is((select status::text from public.jobs where id = (select id from ids where key = 'job1')),
  'pending_review', 'a company''s first job goes to review instead of live');
select throws_ok(
  $$ update public.jobs set status = 'published' where id = (select id from ids where key = 'job1') $$,
  'P0001', 'job_awaiting_review', 'the employer cannot approve their own first job'
);

select tests.authenticate_as('root');
select lives_ok($$ select public.admin_review_job((select id from ids where key = 'job1'), true) $$, 'an admin can approve the job');

select tests.authenticate_as('owner');
select lives_ok(
  $$ with j as (
       insert into public.jobs (company_id, posted_by, title, description, job_type, work_mode, experience_level, city_id, application_deadline)
       values ((select id from ids where key = 'acme'), tests.get_user_id('owner'), 'Frontend Engineer', 'React work',
               'full_time', 'remote', 'entry', null, current_date + 10)
       returning id)
     insert into ids select 'job2', id from j $$,
  'a remote job needs no city'
);
update public.jobs set status = 'published' where id = (select id from ids where key = 'job2');
select is((select status::text from public.jobs where id = (select id from ids where key = 'job2')),
  'published', 'later jobs of a verified company publish directly');
select lives_ok(
  $$ insert into public.job_salaries (job_id, salary_min, salary_max, is_visible)
     values ((select id from ids where key = 'job1'), 80000000, 120000000, false) $$,
  'a member can set a hidden salary'
);
select lives_ok(
  $$ insert into public.job_screening_questions (job_id, question, is_required)
     values ((select id from ids where key = 'job1'), 'Years of Django experience?', true) $$,
  'a member can add a screening question'
);

-- Public visibility and search ------------------------------------------------------
select tests.authenticate_as_anon();
select is((select count(*)::int from public.jobs), 2, 'the public sees published jobs of a verified company');
select is_empty($$ select 1 from public.job_salaries $$, 'a hidden salary is not readable');
select is((select count(*)::int from public.search_jobs(p_q => 'django')), 1, 'search finds a job by keyword');
select is((select count(*)::int from public.search_jobs(p_salary_min => 1)), 0, 'a hidden salary cannot be probed with the salary filter');
select is((select count(*)::int from public.search_jobs(p_work_modes => '{remote}')), 1, 'search filters by work mode');
select is(
  (select count(*)::int from public.search_jobs(p_lat => 19.0760, p_lng => 72.8777, p_radius_km => 5)),
  1, 'search filters by distance from a point'
);
select throws_ok($$ select 1 from public.job_applications $$, '42501', null, 'the public cannot read applications');

-- Applications ------------------------------------------------------------------
select tests.authenticate_as('seeker');
insert into public.cvs (user_id, storage_path, file_name, size_bytes, is_default)
values (tests.get_user_id('seeker'), tests.get_user_id('seeker') || '/cv.pdf', 'cv.pdf', 1000, true);
insert into public.seeker_profiles (user_id, headline) values (tests.get_user_id('seeker'), 'Backend dev');
insert into public.seeker_salary_prefs (user_id, salary_min, share_with_employers) values (tests.get_user_id('seeker'), 90000000, false);

select throws_ok(
  $$ select public.apply_to_job((select id from ids where key = 'job1'), (select id from public.cvs limit 1)) $$,
  '22023', 'required_answer_missing', 'required screening questions must be answered'
);
select throws_ok(
  $$ insert into public.job_applications (job_id, applicant_id, cv_id)
     values ((select id from ids where key = 'job1'), tests.get_user_id('seeker'), (select id from public.cvs limit 1)) $$,
  '42501', null, 'applications cannot be inserted directly'
);
select lives_ok(
  $$ insert into ids select 'app1', public.apply_to_job(
       (select id from ids where key = 'job1'), (select id from public.cvs limit 1), 'Hello',
       jsonb_build_object((select id::text from public.job_screening_questions limit 1), '4 years')) $$,
  'a seeker can apply with a CV and answers'
);
select throws_ok(
  $$ select public.apply_to_job((select id from ids where key = 'job1'), (select id from public.cvs limit 1), null,
       jsonb_build_object((select id::text from public.job_screening_questions limit 1), '4 years')) $$,
  'P0001', 'already_applied', 'a seeker cannot apply twice'
);
select throws_ok(
  $$ update public.job_applications set status = 'hired' $$, '42501', null,
  'a seeker cannot change their application status'
);
select throws_ok(
  $$ select public.set_application_status((select id from ids where key = 'app1'), 'hired') $$,
  '42501', 'not_company_member', 'a seeker cannot use the employer status RPC'
);

select tests.authenticate_as('seeker2');
insert into public.cvs (user_id, storage_path, file_name, size_bytes)
values (tests.get_user_id('seeker2'), tests.get_user_id('seeker2') || '/cv.pdf', 'cv.pdf', 1000);
insert into public.seeker_profiles (user_id, headline) values (tests.get_user_id('seeker2'), 'Second seeker');
select throws_ok(
  $$ select public.apply_to_job((select id from ids where key = 'job2'), (select id from public.cvs where user_id = tests.get_user_id('seeker') limit 1)) $$,
  '22023', 'invalid_cv', 'a seeker cannot apply with someone else''s CV'
);
select lives_ok(
  $$ insert into ids select 'app2', public.apply_to_job(
       (select id from ids where key = 'job1'), (select id from public.cvs where user_id = tests.get_user_id('seeker2')), null,
       jsonb_build_object((select id::text from public.job_screening_questions limit 1), '1 year')) $$,
  'a second seeker can apply'
);
select is((select count(*)::int from public.job_applications), 1, 'a seeker sees only their own application');
select is_empty($$ select 1 from public.cvs where user_id = tests.get_user_id('seeker') $$, 'a seeker cannot see another seeker''s CV');
select is_empty($$ select 1 from public.seeker_profiles where user_id = tests.get_user_id('seeker') $$, 'a seeker cannot see another seeker''s job profile');

-- A different employer sees nothing -------------------------------------------------
select tests.authenticate_as('owner2');
select lives_ok($$ insert into ids select 'beta', public.create_company('Beta Test Ltd') $$, 'a second company is registered');
select is_empty($$ select 1 from public.job_applications $$, 'an employer cannot see applications to another company''s jobs');
select is_empty($$ select 1 from public.cvs $$, 'an employer cannot see CVs of applicants to other companies');
select is_empty($$ select 1 from public.seeker_profiles $$, 'an employer cannot see job profiles of applicants to other companies');
select is_empty($$ select 1 from public.application_answers $$, 'an employer cannot see answers given to other companies');
select throws_ok(
  $$ select public.set_application_status((select id from ids where key = 'app1'), 'rejected') $$,
  '42501', 'not_company_member', 'an employer cannot move another company''s applicant'
);
update public.jobs set title = 'Hacked' where id = (select id from ids where key = 'job1');
select is((select title from public.jobs where id = (select id from ids where key = 'job1')), 'Backend Engineer',
  'an employer cannot edit another company''s job');

-- The employer of the job ------------------------------------------------------------
select tests.authenticate_as('owner');
select is((select count(*)::int from public.job_applications), 2, 'the employer sees applications to their jobs');
select is((select count(*)::int from public.cvs), 2, 'the employer can read the CVs used in those applications');
select is((select count(*)::int from public.seeker_profiles), 2, 'the employer can read applicants'' job profiles');
select is((select count(*)::int from public.application_answers), 2, 'the employer can read screening answers');
select is_empty($$ select 1 from public.seeker_salary_prefs $$, 'salary expectations stay private unless shared');
select lives_ok(
  $$ select public.set_application_status((select id from ids where key = 'app1'), 'shortlisted', 'Strong profile') $$,
  'the employer can move an applicant through the pipeline'
);
select is((select count(*)::int from public.application_notes), 1, 'the status note is saved as a private note');
select lives_ok(
  $$ insert into public.interview_slots (application_id, proposed_by, starts_at, ends_at, location_or_link)
     values ((select id from ids where key = 'app1'), tests.get_user_id('owner'), now() + interval '2 days', now() + interval '2 days 1 hour', 'https://meet.example.test/a'),
            ((select id from ids where key = 'app1'), tests.get_user_id('owner'), now() + interval '3 days', now() + interval '3 days 1 hour', 'https://meet.example.test/b') $$,
  'the employer can propose interview slots'
);
select throws_ok(
  $$ insert into public.interview_slots (application_id, proposed_by, starts_at, ends_at)
     values ((select id from ids where key = 'app1'), tests.get_user_id('owner'), now() - interval '1 day', now() - interval '23 hours') $$,
  'P0001', 'slot_in_past', 'interview slots must be in the future'
);
select throws_ok(
  $$ select public.apply_to_job((select id from ids where key = 'job2'), (select id from public.cvs limit 1)) $$,
  'P0001', 'cannot_apply_to_own_company', 'a company member cannot apply to their own company'
);
delete from public.jobs where id = (select id from ids where key = 'job1');
select is((select count(*)::int from public.jobs where id = (select id from ids where key = 'job1')), 1, 'a published job cannot be deleted');

-- The seeker's view of the pipeline --------------------------------------------------
select tests.authenticate_as('seeker');
select is((select status::text from public.job_applications), 'shortlisted', 'the seeker sees the new status');
select is((select count(*)::int from public.application_status_history), 2, 'the seeker sees the status history');
select is_empty($$ select 1 from public.application_notes $$, 'employer notes are never visible to the applicant');
select is((select count(*)::int from public.interview_slots), 2, 'the seeker sees proposed interview slots');
select lives_ok(
  $$ select public.pick_interview_slot((select id from public.interview_slots order by starts_at limit 1)) $$,
  'the seeker can pick a slot'
);
select results_eq(
  $$ select status::text from public.interview_slots order by starts_at $$,
  array['selected', 'cancelled'], 'picking one slot cancels the others'
);

select tests.authenticate_as('seeker2');
select throws_ok(
  $$ select public.pick_interview_slot((select id from ids where key = 'app1')) $$,
  'P0002', 'slot_not_found', 'a seeker cannot pick slots of another application'
);
select lives_ok($$ select public.withdraw_application((select id from ids where key = 'app2')) $$, 'a seeker can withdraw');

select tests.authenticate_as('owner');
select is((select count(*)::int from public.cvs), 1, 'after a withdrawal the employer loses access to that CV');
select throws_ok(
  $$ select public.set_application_status((select id from ids where key = 'app2'), 'hired') $$,
  'P0001', 'application_withdrawn', 'a withdrawn application cannot be moved'
);

-- Salary shared on opt-in --------------------------------------------------------------
select tests.authenticate_as('seeker');
update public.seeker_salary_prefs set share_with_employers = true;
select tests.authenticate_as('owner');
select is((select count(*)::int from public.seeker_salary_prefs), 1, 'the employer sees salary expectations once the seeker opts in');

-- CV files in storage -------------------------------------------------------------------
select tests.clear_authentication();
insert into storage.objects (bucket_id, name, owner_id)
values ('cvs', tests.get_user_id('seeker') || '/cv.pdf', tests.get_user_id('seeker')::text),
       ('cvs', tests.get_user_id('seeker2') || '/cv.pdf', tests.get_user_id('seeker2')::text);

select tests.authenticate_as('seeker');
select is((select count(*)::int from storage.objects where bucket_id = 'cvs'), 1, 'a seeker can read only their own CV file');
select tests.authenticate_as('owner');
select is((select count(*)::int from storage.objects where bucket_id = 'cvs'), 1,
  'the employer can read the CV file of a live applicant only');
select tests.authenticate_as('owner2');
select is_empty($$ select 1 from storage.objects where bucket_id = 'cvs' $$, 'another employer cannot read CV files');
select tests.authenticate_as_anon();
select is_empty($$ select 1 from storage.objects where bucket_id = 'cvs' $$, 'the public cannot read CV files');

-- Referrals -----------------------------------------------------------------------------
select tests.authenticate_as('referrer');
select throws_ok(
  $$ insert into public.referrals (job_id, referrer_id) values ((select id from ids where key = 'job2'), tests.get_user_id('referrer')) $$,
  'P0001', 'affiliation_required', 'only people who work at the company can refer'
);
select lives_ok(
  $$ insert into public.company_affiliations (user_id, company_id) values (tests.get_user_id('referrer'), (select id from ids where key = 'acme')) $$,
  'a member can say they work at a verified company'
);
select throws_ok(
  $$ update public.company_affiliations set confirmed_by_company_at = now() $$, '42501', null,
  'a member cannot confirm their own affiliation'
);
select lives_ok(
  $$ with r as (insert into public.referrals (job_id, referrer_id, note)
       values ((select id from ids where key = 'job2'), tests.get_user_id('referrer'), 'Great colleague') returning id)
     insert into ids select 'ref', id from r $$,
  'an affiliated member can create a referral link'
);

select tests.authenticate_as('seeker');
select throws_ok(
  $$ select public.apply_to_job((select id from ids where key = 'job2'), (select id from public.cvs limit 1), null, '{}', gen_random_uuid()) $$,
  '22023', 'invalid_referral', 'an unknown referral code is rejected'
);
select lives_ok(
  $$ select public.apply_to_job((select id from ids where key = 'job2'), (select id from public.cvs limit 1), null, '{}', (select id from ids where key = 'ref')) $$,
  'a seeker can apply through a referral link'
);

select tests.authenticate_as('owner');
select is((select count(*)::int from public.job_applications where referral_id is not null), 1, 'the employer sees the referred application flagged');
select lives_ok(
  $$ select public.confirm_affiliation((select id from public.company_affiliations limit 1)) $$,
  'the employer can confirm the referrer works there'
);

-- Saved jobs and searches -------------------------------------------------------------
select tests.authenticate_as('seeker');
select lives_ok(
  $$ insert into public.saved_jobs (user_id, job_id) values (tests.get_user_id('seeker'), (select id from ids where key = 'job2')) $$,
  'a seeker can save a job'
);
select lives_ok(
  $$ insert into public.saved_searches (user_id, name, filters, alert_frequency)
     values (tests.get_user_id('seeker'), 'Remote React', '{"q": "react"}', 'daily') $$,
  'a seeker can save a search'
);
select lives_ok($$ select * from public.recommended_jobs(5) $$, 'recommended jobs run for a seeker');
select tests.authenticate_as('seeker2');
select is_empty($$ select 1 from public.saved_jobs $$, 'saved jobs are private');
select is_empty($$ select 1 from public.saved_searches $$, 'saved searches are private');
select throws_ok(
  $$ insert into public.saved_jobs (user_id, job_id) values (tests.get_user_id('seeker'), (select id from ids where key = 'job2')) $$,
  '42501', null, 'a user cannot save jobs for someone else'
);

-- Deadlines and closed jobs ---------------------------------------------------------------
select tests.clear_authentication();
update public.jobs set application_deadline = current_date - 2 where id = (select id from ids where key = 'job2');
select tests.authenticate_as('seeker2');
select throws_ok(
  $$ select public.apply_to_job((select id from ids where key = 'job2'), (select id from public.cvs limit 1)) $$,
  'P0001', 'deadline_passed', 'applications close after the deadline'
);
select is((select count(*)::int from public.search_jobs()), 1, 'expired jobs drop out of search');

select tests.authenticate_as('owner');
update public.jobs set status = 'closed' where id = (select id from ids where key = 'job1');
select tests.authenticate_as('seeker');
select is((select count(*)::int from public.jobs where id = (select id from ids where key = 'job1')), 1,
  'an applicant can still open a closed job they applied to');
select tests.authenticate_as_anon();
select is_empty($$ select 1 from public.jobs where status = 'closed' $$, 'closed jobs are not public');

select * from finish();
rollback;
