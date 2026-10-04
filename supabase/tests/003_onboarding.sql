-- complete_onboarding RPC.
begin;
select plan(14);
select tests.clear_sample_data();

select tests.create_user('erin');                    -- signed up with Google: no phone yet
select tests.create_user('frank', '910000000021');   -- signed up with phone

select tests.authenticate_as('erin');

select throws_ok(
  $$ select public.complete_onboarding('Erin', 'female', (select id from public.cities where slug = 'mumbai'), '{find_job}') $$,
  '22023', 'phone_required',
  'phone is required when the account has none'
);
select throws_ok(
  $$ select public.complete_onboarding('Erin', 'female', (select id from public.cities where slug = 'mumbai'), '{find_job}', '+15551234567') $$,
  '22023', 'invalid_phone',
  'only Indian mobile numbers are accepted'
);
select throws_ok(
  $$ select public.complete_onboarding('Erin', 'female', gen_random_uuid(), '{find_job}', '+919000000031') $$,
  '22023', 'invalid_city',
  'city must exist'
);
select throws_ok(
  $$ select public.complete_onboarding('Erin', 'female', (select id from public.cities where slug = 'mumbai'), '{}', '+919000000031') $$,
  '22023', 'intents_required',
  'at least one intent is required'
);
select lives_ok(
  $$ select public.complete_onboarding('Erin Test', 'female', (select id from public.cities where slug = 'mumbai'),
       '{find_job,relocate,mentor,help_newcomers}', '+919000000031', 'I have 10 years in fintech') $$,
  'valid onboarding succeeds'
);
select set_eq(
  $$ select role::text from public.user_roles where user_id = tests.get_user_id('erin') $$,
  array['job_seeker', 'mentor', 'buddy'],
  'roles are derived from intents'
);
select set_eq(
  $$ select kind::text from public.verification_requests where user_id = tests.get_user_id('erin') and status = 'pending' $$,
  array['mentor', 'buddy'],
  'mentor and buddy roles create pending verification requests'
);
select ok(
  (select onboarding_completed_at is not null and gender = 'female' and full_name = 'Erin Test'
   from public.profiles where id = tests.get_user_id('erin')),
  'profile is completed'
);
select is(
  (select phone from public.profile_private where user_id = tests.get_user_id('erin')),
  '+919000000031',
  'phone is saved privately'
);

-- Running onboarding again adds roles but does not change gender or duplicate requests.
select lives_ok(
  $$ select public.complete_onboarding('Erin Test', 'male', (select id from public.cities where slug = 'lucknow'), '{hire,mentor}') $$,
  'onboarding can be re-run to add roles'
);
select is(
  (select gender::text from public.profiles where id = tests.get_user_id('erin')),
  'female',
  'gender cannot be changed by re-running onboarding'
);
select is(
  (select count(*)::int from public.verification_requests where user_id = tests.get_user_id('erin')),
  2,
  're-running onboarding does not duplicate verification requests'
);
select ok(public.has_role('employer'), 'hire intent grants the employer role');

select tests.authenticate_as_anon();
select throws_ok(
  $$ select public.complete_onboarding('X', 'male', (select id from public.cities limit 1), '{find_job}', '+919000000032') $$,
  '42501', null,
  'anon cannot call complete_onboarding'
);

select * from finish();
rollback;
