-- Refer someone: organisations that are not on NextStep yet (D-046).
begin;
select no_plan();
select tests.clear_sample_data();

select tests.create_user('worker', '910000000101');
select tests.create_user('worker2', '910000000102');
select tests.create_user('hr', '910000000103');
select tests.create_user('root');
select tests.make_admin('root');
update public.profiles set onboarding_completed_at = now(), full_name = 'Test User', gender = 'male',
  city_id = (select id from public.cities where slug = 'mumbai');

create temp table ids (key text primary key, id uuid);
grant all on ids to authenticated, anon;

-- Adding an organisation by name -------------------------------------------------------
select tests.authenticate_as('worker');
select lives_ok(
  $$ insert into public.company_affiliations (user_id, organisation_name)
     values (tests.get_user_id('worker'), '  Noor   Logistics ') $$,
  'a member can add an organisation that is not on NextStep'
);
select is((select organisation_name from public.company_affiliations), 'Noor Logistics', 'the name is tidied');
select is((select company_id from public.company_affiliations), null, 'and is not linked to any company yet');
select throws_ok(
  $$ insert into public.company_affiliations (user_id, organisation_name) values (tests.get_user_id('worker'), 'noor logistics') $$,
  '23505', null, 'the same organisation cannot be added twice (case-insensitive)'
);
select throws_ok(
  $$ insert into public.company_affiliations (user_id, organisation_name) values (tests.get_user_id('worker2'), 'Someone Else Ltd') $$,
  '42501', null, 'an organisation cannot be added for someone else'
);
select throws_ok(
  $$ insert into public.company_affiliations (user_id) values (tests.get_user_id('worker')) $$,
  '42501', null, 'an entry needs a company or an organisation name'
);
select throws_ok(
  $$ insert into public.company_affiliations (user_id, organisation_name) values (tests.get_user_id('worker'), ' x ') $$,
  '22023', 'organisation_name_required', 'a one-letter name is refused'
);

select tests.authenticate_as('worker2');
insert into public.company_affiliations (user_id, organisation_name) values (tests.get_user_id('worker2'), 'NOOR LOGISTICS');
select is((select count(*)::int from public.company_affiliations), 1, 'members see only their own entries');

-- Registering a company with that name does not link anyone or reveal who works there -----
select tests.authenticate_as('hr');
insert into ids select 'noor', public.create_company('Noor Logistics', 'Logistics', 's11_50', null, 'Freight');
select is((select count(*)::int from public.company_affiliations where company_id is not null), 0,
  'registering a company does not link named entries');
select is_empty($$ select 1 from public.company_affiliations $$,
  'the new (unverified) company cannot see who named it');

-- Admin verification links the matching names ----------------------------------------------
select tests.authenticate_as('root');
select public.admin_review_verification(
  (select id from public.verification_requests where kind = 'company' and subject_id = (select id from ids where key = 'noor')), true);
select is((select count(*)::int from public.company_affiliations where company_id = (select id from ids where key = 'noor')), 2,
  'verifying the company links both named entries');
select ok((select (details ->> 'affiliations_linked')::int = 2 from public.audit_log where action = 'verification_approved' order by created_at desc limit 1),
  'the number linked is in the audit log');

select tests.authenticate_as('hr');
select is((select count(*)::int from public.company_affiliations), 2, 'the verified company now sees the two members');
select is((select count(*)::int from public.company_affiliations where confirmed_by_company_at is null), 2,
  'they stay unconfirmed until the company confirms them');

-- Typing the name of a verified company links at once; limits ------------------------------
select tests.authenticate_as('worker');
select throws_ok(
  $$ insert into public.company_affiliations (user_id, organisation_name) values (tests.get_user_id('worker'), 'noor logistics') $$,
  '23505', null, 'typing the name of a company you are already linked to is a duplicate'
);
delete from public.company_affiliations;
select lives_ok(
  $$ insert into public.company_affiliations (user_id, organisation_name) values (tests.get_user_id('worker'), 'Noor Logistics') $$,
  'typing the name of a verified company'
);
select is((select company_id from public.company_affiliations), (select id from ids where key = 'noor'),
  'links to that company straight away');
select lives_ok(
  $$ insert into public.company_affiliations (user_id, organisation_name)
     select tests.get_user_id('worker'), 'Org ' || n from generate_series(1, 9) n $$,
  'up to 10 entries are allowed'
);
select throws_ok(
  $$ insert into public.company_affiliations (user_id, organisation_name) values (tests.get_user_id('worker'), 'One Too Many') $$,
  'P0001', 'affiliation_limit_reached', 'an 11th entry is refused'
);

select * from finish();
rollback;
