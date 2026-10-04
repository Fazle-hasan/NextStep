-- Test helpers. Runs first (files run in name order) and COMMITs so later files can use them.
-- Local test database only: never applied to the hosted project.
begin;

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

-- Creates an auth user; handle_new_user() then creates the profile rows.
create or replace function tests.create_user(identifier text, phone text default null, meta jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, phone, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          identifier || '@test.local', phone, meta, '{}'::jsonb, now(), now());
  return v_id;
end;
$$;

create or replace function tests.get_user_id(identifier text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where email = identifier || '@test.local';
$$;

create or replace function tests.make_admin(identifier text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_roles (user_id, role)
  values (tests.get_user_id(identifier), 'admin')
  on conflict do nothing;
$$;

-- Switch the current transaction to an authenticated user (security invoker: SET ROLE is not allowed in definer functions).
create or replace function tests.authenticate_as(identifier text)
returns void
language plpgsql
as $$
declare
  v_id uuid := tests.get_user_id(identifier);
begin
  if v_id is null then
    raise exception 'test user % not found', identifier;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Removes seed/sample rows so counts in a test do not depend on supabase/sample-data/.
-- Call it first inside the test's transaction; the final ROLLBACK restores everything.
create or replace function tests.clear_sample_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.companies;
  delete from auth.users;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;
revoke execute on function tests.clear_sample_data() from public, anon, authenticated;

select plan(1);
select has_function('tests', 'authenticate_as', array['text'], 'test helpers installed');
select * from finish();

commit;
