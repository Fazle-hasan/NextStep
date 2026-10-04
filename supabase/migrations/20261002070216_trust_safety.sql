-- M005 trust & safety: verification requests, blocks, reports, audit log, rate limits.

create type public.report_target_type as enum (
  'user', 'company', 'job', 'flat_listing', 'relocation_request', 'review', 'area_tip', 'message', 'place_suggestion'
);
create type public.report_reason as enum ('spam', 'harassment', 'inappropriate', 'fraud', 'fake_profile', 'safety', 'other');
create type public.report_status as enum ('open', 'dismissed', 'actioned');

-- Blocks -------------------------------------------------------------------

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_id_idx on public.blocks (blocked_id);

create trigger blocks_set_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();

-- True if either user blocked the other. Callers may only ask about pairs that include themselves
-- (admins and server-side contexts without a JWT may ask about any pair).
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    ((select auth.uid()) is null or (select auth.uid()) in (a, b) or public.is_admin())
    and exists (
      select 1
      from public.blocks bl
      where (bl.blocker_id = a and bl.blocked_id = b)
         or (bl.blocker_id = b and bl.blocked_id = a)
    );
$$;

revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

-- Other users' profiles are visible unless suspended or blocked either way.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
    or (suspended_at is null and not public.is_blocked_between((select auth.uid()), id))
  );

-- Audit log ----------------------------------------------------------------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  target_table text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audit_log_actor_id_idx on public.audit_log (actor_id);
create index audit_log_target_idx on public.audit_log (target_table, target_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

create trigger audit_log_set_updated_at
  before update on public.audit_log
  for each row execute function public.set_updated_at();

-- Called from admin RPCs (which run as the function owner). Not executable by API roles.
create or replace function public.log_admin_action(
  p_action text,
  p_target_table text default null,
  p_target_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, target_table, target_id, details)
  values ((select auth.uid()), p_action, p_target_table, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke execute on function public.log_admin_action(text, text, uuid, jsonb) from public, anon, authenticated;

-- Generic trigger: records changes made by admins on admin-managed tables.
create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if public.is_admin() then
    insert into public.audit_log (actor_id, action, target_table, target_id, details)
    values (
      (select auth.uid()),
      lower(tg_op),
      tg_table_name,
      (v_row ->> 'id')::uuid,
      case when tg_op = 'UPDATE'
        then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
        else jsonb_build_object('row', v_row)
      end
    );
  end if;
  return coalesce(new, old);
end;
$$;

revoke execute on function public.audit_admin_change() from public, anon, authenticated;

create trigger cities_audit after insert or update or delete on public.cities
  for each row execute function public.audit_admin_change();
create trigger neighbourhoods_audit after insert or update or delete on public.neighbourhoods
  for each row execute function public.audit_admin_change();
create trigger user_roles_audit after insert or update or delete on public.user_roles
  for each row execute function public.audit_admin_change();

-- Rate limiting (D-017) ----------------------------------------------------

create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx on public.rate_limit_events (user_id, action, created_at);

create trigger rate_limit_events_set_updated_at
  before update on public.rate_limit_events
  for each row execute function public.set_updated_at();

-- Raises 'rate_limit_exceeded' when the caller has done p_action p_max times within p_window.
-- No-op without a JWT (service role / cron). Called from security-definer triggers and RPCs.
create or replace function public.check_rate_limit(p_action text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
begin
  if v_uid is null then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || p_action, 0));

  select count(*) into v_count
  from public.rate_limit_events e
  where e.user_id = v_uid
    and e.action = p_action
    and e.created_at > now() - p_window;

  if v_count >= p_max then
    raise exception 'rate_limit_exceeded' using
      errcode = 'P0001',
      detail = format('action=%s max=%s window=%s', p_action, p_max, p_window);
  end if;

  insert into public.rate_limit_events (user_id, action) values (v_uid, p_action);
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, interval) from public, anon, authenticated;

-- Verification requests ----------------------------------------------------

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.verification_kind not null,
  -- company_id when kind = 'company' (FK-checked by a trigger added with the companies table).
  subject_id uuid,
  status public.verification_status not null default 'pending',
  document_paths text[] not null default '{}',
  applicant_note text check (char_length(applicant_note) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text check (char_length(rejection_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'company') = (subject_id is not null)),
  check (cardinality(document_paths) <= 5)
);

create index verification_requests_user_id_idx on public.verification_requests (user_id);
create index verification_requests_reviewed_by_idx on public.verification_requests (reviewed_by);
create index verification_requests_queue_idx on public.verification_requests (status, created_at);
-- At most one pending request per user/kind/subject.
create unique index verification_requests_one_pending_idx
  on public.verification_requests (user_id, kind, subject_id) nulls not distinct
  where status = 'pending';

create trigger verification_requests_set_updated_at
  before update on public.verification_requests
  for each row execute function public.set_updated_at();

-- Reports ------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text check (char_length(resolution_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_resolved_by_idx on public.reports (resolved_by);
create index reports_queue_idx on public.reports (status, created_at);
create index reports_target_idx on public.reports (target_type, target_id);
-- One open report per reporter per target.
create unique index reports_one_open_idx
  on public.reports (reporter_id, target_type, target_id)
  where status = 'open';

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

create or replace function public.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.target_type = 'user' and new.target_id = new.reporter_id then
    raise exception 'cannot_report_self' using errcode = 'P0001';
  end if;
  perform public.check_rate_limit('report', 10, interval '1 hour');
  return new;
end;
$$;

revoke execute on function public.reports_before_insert() from public, anon, authenticated;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

-- RLS ---------------------------------------------------------------------

alter table public.blocks enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.verification_requests enable row level security;
alter table public.reports enable row level security;

revoke all on public.blocks, public.audit_log, public.rate_limit_events,
  public.verification_requests, public.reports from anon, authenticated;

-- blocks: the blocker manages their own blocks. The blocked user cannot see them.
grant select, delete on public.blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;

create policy blocks_select on public.blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()) or (select public.is_admin()));

create policy blocks_insert on public.blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy blocks_delete on public.blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- audit_log, rate_limit_events: admin read-only; written only by definer functions.
grant select on public.audit_log, public.rate_limit_events to authenticated;

create policy audit_log_select on public.audit_log
  for select to authenticated
  using ((select public.is_admin()));

create policy rate_limit_events_select on public.rate_limit_events
  for select to authenticated
  using ((select public.is_admin()));

-- verification_requests: own requests for a role the user holds; status is decided by admin RPC.
grant select, delete on public.verification_requests to authenticated;
grant insert (user_id, kind, subject_id, document_paths, applicant_note) on public.verification_requests to authenticated;
grant update (document_paths, applicant_note) on public.verification_requests to authenticated;

create policy verification_requests_select on public.verification_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy verification_requests_insert on public.verification_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
    and case kind
      when 'company' then (select public.has_role('employer'))
      when 'mentor' then (select public.has_role('mentor'))
      when 'buddy' then (select public.has_role('buddy'))
      when 'flat_lister_id' then (select public.has_role('flat_lister'))
    end
  );

create policy verification_requests_update on public.verification_requests
  for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status = 'pending');

create policy verification_requests_delete on public.verification_requests
  for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');

-- reports: anyone signed in can report (rate-limited); reporters see their own; admins see all.
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;

create policy reports_select on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

create policy reports_insert on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and resolved_by is null
    and resolved_at is null
  );
