-- Phase 6 / M020 scheduled jobs (pg_cron) and the job-alert digest (PRODUCT_SPEC §4, §9; D-016).
-- Edge Functions are called through pg_net with a shared secret. The project URL and the secret are read
-- from Vault at run time ('edge_functions_url' and 'cron_secret'); while either is missing the call is a no-op,
-- so this migration is safe on a project where the functions are not deployed yet (and on the local stack).

create or replace function private.call_edge_function(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null then
    return;
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into v_url using 'edge_functions_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into v_secret using 'cron_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/' || p_name,
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke execute on function private.call_edge_function(text) from public, anon, authenticated;

-- create_job_alert_digests: one notification per daily saved search that has new matching jobs since the
-- last alert. Called by the job-alert-digest Edge Function (service role) and safe to call from SQL.
-- The salary filter is ignored here so a digest can never reveal that a hidden salary matches.
create or replace function private.create_job_alert_digests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_search public.saved_searches;
  v_f jsonb;
  v_since timestamptz;
  v_count integer;
  v_titles text;
  v_made integer := 0;
begin
  for v_search in
    select * from public.saved_searches s
    where s.alert_frequency = 'daily'
      and exists (select 1 from public.profiles p where p.id = s.user_id and p.suspended_at is null)
    order by s.created_at
    for update skip locked
  loop
    v_f := v_search.filters;
    v_since := coalesce(v_search.last_alerted_at, v_search.created_at, now() - interval '1 day');

    begin
      select count(*), string_agg(r.title || ' at ' || r.company_name, '; ' order by r.published_at desc)
        filter (where r.rn <= 5)
      into v_count, v_titles
      from (
        select j.title, j.company_name, j.published_at, row_number() over (order by j.published_at desc) as rn
        from public.search_jobs(
          p_q => nullif(v_f ->> 'q', ''),
          p_city_id => nullif(v_f ->> 'city', '')::uuid,
          p_lat => (v_f ->> 'lat')::double precision,
          p_lng => (v_f ->> 'lng')::double precision,
          p_radius_km => (v_f ->> 'radius')::integer,
          p_job_types => case when jsonb_typeof(v_f -> 'types') = 'array' and jsonb_array_length(v_f -> 'types') > 0
            then array(select jsonb_array_elements_text(v_f -> 'types'))::public.job_type[] end,
          p_work_modes => case when jsonb_typeof(v_f -> 'modes') = 'array' and jsonb_array_length(v_f -> 'modes') > 0
            then array(select jsonb_array_elements_text(v_f -> 'modes'))::public.work_mode[] end,
          p_levels => case when jsonb_typeof(v_f -> 'levels') = 'array' and jsonb_array_length(v_f -> 'levels') > 0
            then array(select jsonb_array_elements_text(v_f -> 'levels'))::public.experience_level[] end,
          p_leap_friendly => case when (v_f ->> 'leap') = 'true' then true end,
          p_limit => 50
        ) j
        where j.published_at > v_since
      ) r;
    exception when others then
      -- A malformed saved filter must not stop the other digests.
      v_count := 0;
    end;

    if v_count > 0 then
      perform private.notify(
        v_search.user_id, 'job_alert',
        v_count || case when v_count = 1 then ' new job' else ' new jobs' end || ' for "' || v_search.name || '"',
        v_titles, '/saved', jsonb_build_object('saved_search_id', v_search.id, 'count', v_count)
      );
      v_made := v_made + 1;
    end if;
    update public.saved_searches set last_alerted_at = now() where id = v_search.id;
  end loop;
  return v_made;
end;
$$;

-- API entry point for the Edge Function. Service role only.
create or replace function public.run_job_alert_digest()
returns integer
language sql security invoker set search_path = ''
as $$
  select private.create_job_alert_digests();
$$;

revoke execute on function private.create_job_alert_digests() from public, anon, authenticated;
revoke execute on function public.run_job_alert_digest() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.create_job_alert_digests() to service_role;
grant execute on function public.run_job_alert_digest() to service_role;

-- Housekeeping run by cron (no JWT, so the status guards treat it as a server-side change).
create or replace function private.run_hourly_maintenance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Jobs past their application deadline.
  update public.jobs
  set status = 'expired'
  where status = 'published'
    and application_deadline is not null
    and application_deadline < (now() at time zone 'Asia/Kolkata')::date;

  -- Confirmed mentor sessions that ended more than an hour ago.
  update public.mentorship_sessions
  set status = 'completed'
  where status = 'confirmed' and ends_at < now() - interval '1 hour';
end;
$$;

revoke execute on function private.run_hourly_maintenance() from public, anon, authenticated;

select cron.schedule('hourly-maintenance', '10 * * * *', $$select private.run_hourly_maintenance()$$);
select cron.schedule('purge-rate-limit-events', '25 3 * * *',
  $$delete from public.rate_limit_events where created_at < now() - interval '1 day'$$);
-- Old read notifications are removed after 90 days.
select cron.schedule('purge-old-notifications', '40 3 * * *',
  $$delete from public.notifications where read_at is not null and created_at < now() - interval '90 days'$$);
select cron.schedule('dispatch-notifications', '* * * * *', $$select private.call_edge_function('dispatch-notifications')$$);
-- 02:00 UTC = 07:30 IST.
select cron.schedule('job-alert-digest', '0 2 * * *', $$select private.call_edge_function('job-alert-digest')$$);
