-- Phase 4 / M016 flatmate matching (PRODUCT_SPEC §7.4).
-- Hard filters (same city, gender preference both ways, blocks) are enforced in RLS, so a profile a user
-- could not match with is not readable at all. Connection status changes only through RPCs (D-015).

create type public.flatmate_gender_pref as enum ('any', 'male', 'female');
create type public.food_habit as enum ('veg', 'non_veg', 'halal_only');
create type public.sleep_schedule as enum ('early_bird', 'night_owl', 'flexible');
create type public.work_schedule as enum ('day_shift', 'night_shift', 'work_from_home', 'student', 'flexible');
create type public.guests_policy as enum ('no_guests', 'occasionally', 'often');

create table public.flatmate_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete restrict,
  neighbourhood_ids uuid[] not null default '{}' check (cardinality(neighbourhood_ids) <= 20),
  -- Monthly budget in paise.
  budget_min integer not null check (budget_min >= 0),
  budget_max integer not null check (budget_max >= 0),
  currency char(3) not null default 'INR',
  move_date date not null,
  -- The user's own gender comes from profiles.gender (set once at onboarding, D-013).
  preferred_gender public.flatmate_gender_pref not null default 'any',
  food_habit public.food_habit not null,
  smokes boolean not null default false,
  ok_with_smoker boolean not null default false,
  sleep_schedule public.sleep_schedule not null default 'flexible',
  work_schedule public.work_schedule not null default 'flexible',
  cleanliness smallint not null default 3 check (cleanliness between 1 and 5),
  guests_policy public.guests_policy not null default 'occasionally',
  bio text check (char_length(bio) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_max >= budget_min)
);

create index flatmate_profiles_city_idx on public.flatmate_profiles (city_id, is_active);

create trigger flatmate_profiles_set_updated_at
  before update on public.flatmate_profiles
  for each row execute function public.set_updated_at();

create table public.flatmate_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  message text check (char_length(message) <= 500),
  status public.offer_status not null default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);

create index flatmate_connections_requester_idx on public.flatmate_connections (requester_id, created_at desc);
create index flatmate_connections_recipient_idx on public.flatmate_connections (recipient_id, created_at desc);
-- One live connection per pair, whichever side asked.
create unique index flatmate_connections_one_live_idx
  on public.flatmate_connections (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
  where status in ('pending', 'accepted');

create trigger flatmate_connections_set_updated_at
  before update on public.flatmate_connections
  for each row execute function public.set_updated_at();

-- Helpers ------------------------------------------------------------------------

-- The hard filters: both profiles active, same city, neither suspended, no block either way,
-- and each side's gender preference accepts the other's gender.
create or replace function private.flatmate_compatible(p_other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.flatmate_profiles mine
    join public.profiles me on me.id = mine.user_id
    join public.flatmate_profiles theirs on theirs.user_id = p_other
    join public.profiles them on them.id = theirs.user_id
    where mine.user_id = (select auth.uid())
      and mine.user_id <> p_other
      and mine.is_active and theirs.is_active
      and mine.city_id = theirs.city_id
      and me.suspended_at is null and them.suspended_at is null
      and me.gender is not null and them.gender is not null
      and (mine.preferred_gender = 'any' or mine.preferred_gender::text = them.gender::text)
      and (theirs.preferred_gender = 'any' or theirs.preferred_gender::text = me.gender::text)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = me.id and b.blocked_id = them.id)
           or (b.blocker_id = them.id and b.blocked_id = me.id)
      )
  );
$$;

-- People the caller already has a pending or accepted connection with stay visible (unless blocked).
create or replace function private.has_flatmate_connection(p_other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.flatmate_connections c
    where c.status in ('pending', 'accepted')
      and ((c.requester_id = (select auth.uid()) and c.recipient_id = p_other)
        or (c.recipient_id = (select auth.uid()) and c.requester_id = p_other))
  )
  and not private.is_blocked_between((select auth.uid()), p_other);
$$;

-- Profile rules on insert: finished onboarding.
create or replace function public.flatmate_profiles_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not exists (
    select 1 from public.profiles p
    where p.id = new.user_id and p.onboarding_completed_at is not null and p.suspended_at is null
  ) then
    raise exception 'onboarding_required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.flatmate_profiles_before_insert() from public, anon, authenticated;

create trigger flatmate_profiles_before_insert
  before insert on public.flatmate_profiles
  for each row execute function public.flatmate_profiles_before_insert();

-- RPCs ---------------------------------------------------------------------------

-- get_flatmate_matches: compatible profiles sorted by a 0–100 score. Invoker: RLS applies the hard filters
-- (city, gender both ways, blocks); the score only ranks what the caller may already see.
--   shared areas 20 · budget overlap 20 · move date 15 · food 10 · smoking 10 · cleanliness 10
--   sleep 5 · work 5 · guests 5
create or replace function public.get_flatmate_matches(p_limit integer default 20, p_offset integer default 0)
returns table (
  user_id uuid,
  full_name text,
  avatar_path text,
  gender public.gender,
  score integer,
  neighbourhood_ids uuid[],
  budget_min integer,
  budget_max integer,
  move_date date,
  food_habit public.food_habit,
  smokes boolean,
  sleep_schedule public.sleep_schedule,
  work_schedule public.work_schedule,
  cleanliness smallint,
  guests_policy public.guests_policy,
  bio text,
  connection_status public.offer_status
)
language sql stable security invoker set search_path = ''
as $$
  select
    o.user_id, p.full_name, p.avatar_path, p.gender,
    (
      case when o.neighbourhood_ids && me.neighbourhood_ids then 20
           when cardinality(o.neighbourhood_ids) = 0 or cardinality(me.neighbourhood_ids) = 0 then 10
           else 0 end
      + case when o.budget_min <= me.budget_max and me.budget_min <= o.budget_max then 20 else 0 end
      + case when abs(o.move_date - me.move_date) <= 15 then 15
             when abs(o.move_date - me.move_date) <= 30 then 10
             when abs(o.move_date - me.move_date) <= 60 then 5
             else 0 end
      + case when o.food_habit = me.food_habit then 10
             when 'veg' not in (o.food_habit, me.food_habit) then 5
             else 0 end
      + case when (not o.smokes or me.ok_with_smoker) and (not me.smokes or o.ok_with_smoker) then 10 else 0 end
      + (10 - 2 * abs(o.cleanliness - me.cleanliness))
      + case when o.sleep_schedule = me.sleep_schedule or 'flexible' in (o.sleep_schedule, me.sleep_schedule)
             then 5 else 0 end
      + case when o.work_schedule = me.work_schedule or 'flexible' in (o.work_schedule, me.work_schedule)
             then 5 else 0 end
      + case when o.guests_policy = me.guests_policy then 5
             when 'occasionally' in (o.guests_policy, me.guests_policy) then 3
             else 0 end
    )::integer as score,
    o.neighbourhood_ids, o.budget_min, o.budget_max, o.move_date, o.food_habit, o.smokes,
    o.sleep_schedule, o.work_schedule, o.cleanliness, o.guests_policy, o.bio,
    (
      select c.status from public.flatmate_connections c
      where c.status in ('pending', 'accepted')
        and ((c.requester_id = me.user_id and c.recipient_id = o.user_id)
          or (c.recipient_id = me.user_id and c.requester_id = o.user_id))
      limit 1
    )
  from public.flatmate_profiles me
  join public.flatmate_profiles o
    on o.user_id <> me.user_id and o.city_id = me.city_id and o.is_active
  join public.profiles p on p.id = o.user_id
  where me.user_id = (select auth.uid())
    and me.is_active
    and private.flatmate_compatible(o.user_id)
  order by score desc, o.updated_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- send_flatmate_connection: the hard filters are re-checked here.
create or replace function private.send_flatmate_connection(p_recipient_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(v_message) > 500 then
    raise exception 'message_too_long' using errcode = '22023';
  end if;
  if not private.flatmate_compatible(p_recipient_id) then
    raise exception 'not_a_match' using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('flatmate_connection', 20, interval '1 day');

  begin
    insert into public.flatmate_connections (requester_id, recipient_id, message)
    values (v_uid, p_recipient_id, v_message)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_connected' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

create or replace function public.send_flatmate_connection(p_recipient_id uuid, p_message text default null)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.send_flatmate_connection(p_recipient_id, p_message);
$$;

-- respond_flatmate_connection: the recipient accepts or declines. Accepting opens a conversation (returned).
create or replace function private.respond_flatmate_connection(p_connection_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_connection public.flatmate_connections;
begin
  select * into v_connection from public.flatmate_connections c
  where c.id = p_connection_id and c.recipient_id = v_uid
  for update;
  if not found then
    raise exception 'connection_not_found' using errcode = 'P0002';
  end if;
  if v_connection.status <> 'pending' then
    raise exception 'connection_already_decided' using errcode = 'P0001';
  end if;

  if not p_accept then
    update public.flatmate_connections set status = 'declined', decided_at = now() where id = p_connection_id;
    return null;
  end if;

  if private.is_blocked_between(v_uid, v_connection.requester_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  update public.flatmate_connections set status = 'accepted', decided_at = now() where id = p_connection_id;
  return private.open_conversation('flatmate_connection', p_connection_id, v_connection.requester_id, v_uid);
end;
$$;

create or replace function public.respond_flatmate_connection(p_connection_id uuid, p_accept boolean)
returns uuid
language sql security invoker set search_path = ''
as $$
  select private.respond_flatmate_connection(p_connection_id, p_accept);
$$;

-- withdraw_flatmate_connection: the requester takes back a pending request.
create or replace function private.withdraw_flatmate_connection(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.flatmate_connections
  set status = 'withdrawn', decided_at = now()
  where id = p_connection_id and requester_id = (select auth.uid()) and status = 'pending';
  if not found then
    raise exception 'connection_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.withdraw_flatmate_connection(p_connection_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.withdraw_flatmate_connection(p_connection_id);
$$;

revoke execute on function
  private.flatmate_compatible(uuid), private.has_flatmate_connection(uuid),
  private.send_flatmate_connection(uuid, text), private.respond_flatmate_connection(uuid, boolean),
  private.withdraw_flatmate_connection(uuid)
  from public, anon, authenticated;
revoke execute on function
  public.get_flatmate_matches(integer, integer),
  public.send_flatmate_connection(uuid, text), public.respond_flatmate_connection(uuid, boolean),
  public.withdraw_flatmate_connection(uuid)
  from public, anon;
grant execute on function
  private.flatmate_compatible(uuid), private.has_flatmate_connection(uuid),
  private.send_flatmate_connection(uuid, text), private.respond_flatmate_connection(uuid, boolean),
  private.withdraw_flatmate_connection(uuid)
  to authenticated;
grant execute on function
  public.get_flatmate_matches(integer, integer),
  public.send_flatmate_connection(uuid, text), public.respond_flatmate_connection(uuid, boolean),
  public.withdraw_flatmate_connection(uuid)
  to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.flatmate_profiles enable row level security;
alter table public.flatmate_connections enable row level security;

revoke all on public.flatmate_profiles, public.flatmate_connections from anon, authenticated;

-- flatmate_profiles: the owner manages their own; others read it only when the hard filters pass
-- both ways, or when they already have a live connection.
grant select, delete on public.flatmate_profiles to authenticated;
grant insert (user_id, city_id, neighbourhood_ids, budget_min, budget_max, move_date, preferred_gender, food_habit,
  smokes, ok_with_smoker, sleep_schedule, work_schedule, cleanliness, guests_policy, bio, is_active)
  on public.flatmate_profiles to authenticated;
grant update (city_id, neighbourhood_ids, budget_min, budget_max, move_date, preferred_gender, food_habit,
  smokes, ok_with_smoker, sleep_schedule, work_schedule, cleanliness, guests_policy, bio, is_active)
  on public.flatmate_profiles to authenticated;

create policy flatmate_profiles_select on public.flatmate_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or private.flatmate_compatible(user_id)
    or private.has_flatmate_connection(user_id)
  );
create policy flatmate_profiles_insert on public.flatmate_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy flatmate_profiles_update on public.flatmate_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy flatmate_profiles_delete on public.flatmate_profiles
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- flatmate_connections: read-only for API roles; both sides see a connection.
grant select on public.flatmate_connections to authenticated;

create policy flatmate_connections_select on public.flatmate_connections
  for select to authenticated
  using ((select auth.uid()) in (requester_id, recipient_id) or (select public.is_admin()));
