-- profiles, profile_private, user_roles, cities/neighbourhoods, signup trigger.
begin;
select plan(30);
select tests.clear_sample_data();

select tests.create_user('alice', '910000000001', '{"full_name": "Alice Test"}');
select tests.create_user('bob', '910000000002');
select tests.create_user('root');
select tests.make_admin('root');

-- Signup trigger -------------------------------------------------------------
select is(
  (select full_name from public.profiles where id = tests.get_user_id('alice')),
  'Alice Test',
  'signup creates a profile with the name from metadata'
);
select is(
  (select phone from public.profile_private where user_id = tests.get_user_id('alice')),
  '+910000000001',
  'signup copies the auth phone into profile_private in E.164 form'
);
select is(
  (select phone from public.profile_private where user_id = tests.get_user_id('root')),
  null,
  'signup without phone leaves phone empty'
);

-- Owner ----------------------------------------------------------------------
select tests.authenticate_as('alice');

select is(
  (select count(*)::int from public.profiles where id = tests.get_user_id('alice')),
  1,
  'owner can read own profile'
);
select is(
  (select count(*)::int from public.profile_private where user_id = tests.get_user_id('alice')),
  1,
  'owner can read own private details'
);
select lives_ok(
  $$ update public.profiles set full_name = 'Alice Renamed', bio = 'hello' where id = tests.get_user_id('alice') $$,
  'owner can update editable profile fields'
);
select is(
  (select full_name from public.profiles where id = tests.get_user_id('alice')),
  'Alice Renamed',
  'owner profile update persisted'
);
select throws_ok(
  $$ update public.profiles set suspended_at = now() where id = tests.get_user_id('alice') $$,
  '42501', null,
  'owner cannot set suspended_at'
);
select throws_ok(
  $$ update public.profiles set gender = 'male' where id = tests.get_user_id('alice') $$,
  '42501', null,
  'owner cannot change gender directly'
);
select throws_ok(
  $$ update public.profiles set onboarding_completed_at = now() where id = tests.get_user_id('alice') $$,
  '42501', null,
  'owner cannot set onboarding_completed_at directly'
);
select lives_ok(
  $$ update public.profile_private set whatsapp_opt_in = true where user_id = tests.get_user_id('alice') $$,
  'owner can update own private details'
);
select lives_ok(
  $$ insert into public.user_roles (user_id, role) values (tests.get_user_id('alice'), 'job_seeker') $$,
  'owner can add a non-admin role'
);
select throws_ok(
  $$ insert into public.user_roles (user_id, role) values (tests.get_user_id('alice'), 'admin') $$,
  '42501', null,
  'owner cannot self-assign admin'
);
select throws_ok(
  $$ insert into public.user_roles (user_id, role) values (tests.get_user_id('bob'), 'mentor') $$,
  '42501', null,
  'user cannot add roles for someone else'
);
select ok(public.has_role('job_seeker') and not public.is_admin(), 'has_role reflects own roles');

-- Other user -----------------------------------------------------------------
select is(
  (select count(*)::int from public.profiles where id = tests.get_user_id('bob')),
  1,
  'other users'' public profiles are visible when not blocked'
);
select is_empty(
  $$ select 1 from public.profile_private where user_id = tests.get_user_id('bob') $$,
  'cannot read another user''s private details'
);
update public.profiles set full_name = 'Hacked' where id = tests.get_user_id('bob');
update public.profile_private set phone = '+910000000099' where user_id = tests.get_user_id('bob');

select tests.authenticate_as('bob');
select is(
  (select full_name from public.profiles where id = tests.get_user_id('bob')),
  null,
  'cannot update another user''s profile'
);
select is(
  (select phone from public.profile_private where user_id = tests.get_user_id('bob')),
  '+910000000002',
  'cannot update another user''s private details'
);
select is_empty(
  $$ select 1 from public.user_roles where user_id = tests.get_user_id('alice') $$,
  'cannot read another user''s roles'
);
delete from public.user_roles where user_id = tests.get_user_id('alice');
select throws_ok(
  $$ insert into public.cities (name, slug, state, center) values ('X', 'x', 'X', 'POINT(0 0)') $$,
  '42501', null,
  'non-admin cannot insert cities'
);

-- Admin ----------------------------------------------------------------------
select tests.authenticate_as('root');
select is(
  (select count(*)::int from public.profile_private),
  3,
  'admin can read all private details'
);
select is(
  (select count(*)::int from public.user_roles where user_id = tests.get_user_id('alice')),
  1,
  'other user could not delete alice''s role; admin sees it'
);
select lives_ok(
  $$ insert into public.user_roles (user_id, role) values (tests.get_user_id('bob'), 'admin') $$,
  'admin can grant admin'
);
select is(
  (select count(*)::int from public.audit_log where target_table = 'user_roles' and action = 'insert'),
  1,
  'admin role grant is written to the audit log'
);
select lives_ok(
  $$ insert into public.cities (name, slug, state, center) values ('Pune', 'pune', 'Maharashtra', 'POINT(73.8567 18.5204)') $$,
  'admin can add a city'
);

-- Anonymous ------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok($$ select 1 from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select 1 from public.user_roles $$, '42501', null, 'anon cannot read roles');
select is((select count(*)::int from public.cities), 6, 'anon can read cities');
select ok((select count(*) from public.neighbourhoods) > 0, 'anon can read neighbourhoods');

select * from finish();
rollback;
