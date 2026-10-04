-- blocks, reports, verification_requests, audit_log, rate limits.
begin;
select plan(33);
select tests.clear_sample_data();

select tests.create_user('alice', '910000000011');
select tests.create_user('bob', '910000000012');
select tests.create_user('carol', '910000000013');
select tests.create_user('dave', '910000000014');
select tests.create_user('root');
select tests.make_admin('root');

-- Blocks ---------------------------------------------------------------------
select tests.authenticate_as('alice');
select lives_ok(
  $$ insert into public.blocks (blocker_id, blocked_id) values (tests.get_user_id('alice'), tests.get_user_id('bob')) $$,
  'user can block another user'
);
select throws_ok(
  $$ insert into public.blocks (blocker_id, blocked_id) values (tests.get_user_id('carol'), tests.get_user_id('dave')) $$,
  '42501', null,
  'user cannot create a block on behalf of someone else'
);
select is((select count(*)::int from public.blocks), 1, 'blocker sees own block');
select is_empty(
  $$ select 1 from public.profiles where id = tests.get_user_id('bob') $$,
  'blocker no longer sees the blocked user''s profile'
);

select tests.authenticate_as('bob');
select is_empty($$ select 1 from public.blocks $$, 'blocked user cannot see the block');
select is_empty(
  $$ select 1 from public.profiles where id = tests.get_user_id('alice') $$,
  'blocked user cannot see the blocker''s profile'
);
delete from public.blocks;

select tests.authenticate_as('carol');
select ok(
  not public.is_blocked_between(tests.get_user_id('alice'), tests.get_user_id('bob')),
  'third parties cannot probe whether two users blocked each other'
);
select is(
  (select count(*)::int from public.profiles where id in (tests.get_user_id('alice'), tests.get_user_id('bob'))),
  2,
  'third parties still see both profiles'
);

select tests.authenticate_as('root');
select is((select count(*)::int from public.blocks), 1, 'admin sees blocks; blocked user could not delete the block');
select ok(
  public.is_blocked_between(tests.get_user_id('alice'), tests.get_user_id('bob')),
  'admin can check blocks between any pair'
);

-- Reports --------------------------------------------------------------------
select tests.authenticate_as('alice');
select lives_ok(
  $$ insert into public.reports (reporter_id, target_type, target_id, reason, details)
     values (tests.get_user_id('alice'), 'user', tests.get_user_id('bob'), 'harassment', 'test') $$,
  'user can report another user'
);
select is((select count(*)::int from public.reports), 1, 'reporter sees own report');
select throws_ok(
  $$ insert into public.reports (reporter_id, target_type, target_id, reason)
     values (tests.get_user_id('alice'), 'user', tests.get_user_id('alice'), 'spam') $$,
  'P0001', 'cannot_report_self',
  'user cannot report themselves'
);
select throws_ok(
  $$ insert into public.reports (reporter_id, target_type, target_id, reason, status)
     values (tests.get_user_id('alice'), 'job', gen_random_uuid(), 'spam', 'actioned') $$,
  '42501', null,
  'reporter cannot set the report status'
);
select throws_ok(
  $$ insert into public.reports (reporter_id, target_type, target_id, reason)
     values (tests.get_user_id('carol'), 'job', gen_random_uuid(), 'spam') $$,
  '42501', null,
  'user cannot file a report as someone else'
);
select throws_ok(
  $$ update public.reports set status = 'dismissed' $$,
  '42501', null,
  'reporter cannot change a report'
);

select tests.authenticate_as('bob');
select is_empty($$ select 1 from public.reports $$, 'other users cannot see reports');

-- Rate limit: 10 reports per hour.
select tests.authenticate_as('dave');
select lives_ok(
  $$ insert into public.reports (reporter_id, target_type, target_id, reason)
     select tests.get_user_id('dave'), 'job', gen_random_uuid(), 'spam' from generate_series(1, 10) $$,
  'ten reports within an hour are allowed'
);
select throws_ok(
  $$ insert into public.reports (reporter_id, target_type, target_id, reason)
     values (tests.get_user_id('dave'), 'job', gen_random_uuid(), 'spam') $$,
  'P0001', 'rate_limit_exceeded',
  'the eleventh report within an hour is rejected'
);
select is_empty($$ select 1 from public.rate_limit_events $$, 'users cannot read rate limit events');

select tests.authenticate_as('root');
select is((select count(*)::int from public.reports), 11, 'admin sees all reports');

-- Verification requests ------------------------------------------------------
select tests.authenticate_as('carol');
select throws_ok(
  $$ insert into public.verification_requests (user_id, kind) values (tests.get_user_id('carol'), 'mentor') $$,
  '42501', null,
  'cannot request mentor verification without the mentor role'
);
insert into public.user_roles (user_id, role) values (tests.get_user_id('carol'), 'mentor');
select lives_ok(
  $$ insert into public.verification_requests (user_id, kind, applicant_note) values (tests.get_user_id('carol'), 'mentor', 'please') $$,
  'mentor can request verification'
);
select throws_ok(
  $$ insert into public.verification_requests (user_id, kind) values (tests.get_user_id('carol'), 'mentor') $$,
  '23505', null,
  'only one pending request per kind'
);
select throws_ok(
  $$ update public.verification_requests set status = 'approved' $$,
  '42501', null,
  'applicant cannot approve their own request'
);
select lives_ok(
  $$ update public.verification_requests set applicant_note = 'updated' $$,
  'applicant can edit the note while pending'
);

select tests.authenticate_as('bob');
select is_empty($$ select 1 from public.verification_requests $$, 'other users cannot see verification requests');

select tests.authenticate_as('root');
select is((select count(*)::int from public.verification_requests), 1, 'admin sees verification requests');

-- Audit log and internal helpers -----------------------------------------------
select tests.authenticate_as('alice');
select is_empty($$ select 1 from public.audit_log $$, 'users cannot read the audit log');
select throws_ok(
  $$ insert into public.audit_log (action) values ('forged') $$,
  '42501', null,
  'users cannot write the audit log'
);
select throws_ok(
  $$ select public.log_admin_action('forged') $$,
  '42501', null,
  'users cannot call log_admin_action'
);
select throws_ok(
  $$ select public.check_rate_limit('x', 1, interval '1 minute') $$,
  '42501', null,
  'users cannot call check_rate_limit directly'
);

select tests.authenticate_as_anon();
select throws_ok($$ select 1 from public.reports $$, '42501', null, 'anon cannot read reports');

select * from finish();
rollback;
