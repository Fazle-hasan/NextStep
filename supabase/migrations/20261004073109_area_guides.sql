-- Phase 5 / M018 area guides and community tips (PRODUCT_SPEC §8.2).
-- Guides are written by admins and public once published. Tips are short posts by verified Settle-In
-- Buddies (and admins), upvotable by signed-in members, reportable and moderated.

create table public.area_guides (
  id uuid primary key default gen_random_uuid(),
  neighbourhood_id uuid not null unique references public.neighbourhoods (id) on delete cascade,
  summary text not null check (char_length(summary) between 1 and 5000),
  -- Typical monthly rent in paise per listing type, e.g. {"private_room": {"min": 800000, "max": 1500000}}.
  rent_ranges jsonb not null default '{}'::jsonb check (jsonb_typeof(rent_ranges) = 'object'),
  commute_notes text check (char_length(commute_notes) <= 2000),
  safety_notes text check (char_length(safety_notes) <= 2000),
  halal_food_notes text check (char_length(halal_food_notes) <= 2000),
  is_published boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index area_guides_updated_by_idx on public.area_guides (updated_by);

create trigger area_guides_set_updated_at
  before update on public.area_guides
  for each row execute function public.set_updated_at();

create trigger area_guides_audit after insert or update or delete on public.area_guides
  for each row execute function public.audit_admin_change();

create table public.area_tips (
  id uuid primary key default gen_random_uuid(),
  neighbourhood_id uuid not null references public.neighbourhoods (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Plain text.
  body text not null check (char_length(body) between 5 and 500),
  -- Maintained by a trigger on area_tip_votes; not writable by API roles.
  upvote_count integer not null default 0,
  deleted_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index area_tips_neighbourhood_idx on public.area_tips (neighbourhood_id, upvote_count desc, created_at desc);
create index area_tips_author_id_idx on public.area_tips (author_id);

create trigger area_tips_set_updated_at
  before update on public.area_tips
  for each row execute function public.set_updated_at();

create table public.area_tip_votes (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.area_tips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tip_id, user_id)
);

create index area_tip_votes_user_id_idx on public.area_tip_votes (user_id);

create trigger area_tip_votes_set_updated_at
  before update on public.area_tip_votes
  for each row execute function public.set_updated_at();

-- Helpers ------------------------------------------------------------------------

-- Tips come from verified, active Settle-In Buddies (or admins) who are not suspended.
create or replace function private.can_post_area_tip()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.suspended_at is null
      and (
        private.is_admin()
        or exists (
          select 1 from public.buddy_profiles b
          where b.user_id = p.id and b.verification_status = 'approved' and b.is_active
        )
      )
  );
$$;

create or replace function public.can_post_area_tip()
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select private.can_post_area_tip();
$$;

create or replace function public.area_tips_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if not private.can_post_area_tip() then
    raise exception 'verified_buddy_required' using errcode = '42501';
  end if;
  new.body := btrim(new.body);
  perform public.check_rate_limit('area_tip', 10, interval '1 day');
  return new;
end;
$$;

revoke execute on function public.area_tips_before_insert() from public, anon, authenticated;

create trigger area_tips_before_insert
  before insert on public.area_tips
  for each row execute function public.area_tips_before_insert();

-- Votes: one per user per tip, only on visible tips, never on your own. Keeps upvote_count current.
create or replace function public.area_tip_votes_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
begin
  select t.author_id into v_author
  from public.area_tips t
  where t.id = new.tip_id and t.deleted_at is null and t.hidden_at is null;
  if not found then
    raise exception 'tip_not_found' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is not null then
    if v_author = new.user_id then
      raise exception 'own_tip' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.profiles p where p.id = new.user_id and p.suspended_at is not null) then
      raise exception 'account_suspended' using errcode = 'P0001';
    end if;
    perform public.check_rate_limit('area_tip_vote', 100, interval '1 day');
  end if;
  return new;
end;
$$;

revoke execute on function public.area_tip_votes_before_insert() from public, anon, authenticated;

create trigger area_tip_votes_before_insert
  before insert on public.area_tip_votes
  for each row execute function public.area_tip_votes_before_insert();

create or replace function public.area_tip_votes_sync_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tip uuid := coalesce(new.tip_id, old.tip_id);
begin
  update public.area_tips t
  set upvote_count = (select count(*) from public.area_tip_votes v where v.tip_id = v_tip)
  where t.id = v_tip;
  return null;
end;
$$;

revoke execute on function public.area_tip_votes_sync_count() from public, anon, authenticated;

create trigger area_tip_votes_sync_count
  after insert or delete on public.area_tip_votes
  for each row execute function public.area_tip_votes_sync_count();

-- delete_area_tip: the author soft-deletes their tip (kept for moderation history).
create or replace function private.delete_area_tip(p_tip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.area_tips
  set deleted_at = now()
  where id = p_tip_id and author_id = (select auth.uid()) and deleted_at is null;
  if not found then
    raise exception 'tip_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.delete_area_tip(p_tip_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  select private.delete_area_tip(p_tip_id);
$$;

revoke execute on function private.can_post_area_tip(), private.delete_area_tip(uuid) from public, anon, authenticated;
revoke execute on function public.can_post_area_tip(), public.delete_area_tip(uuid) from public, anon;
grant execute on function private.can_post_area_tip(), private.delete_area_tip(uuid) to authenticated;
grant execute on function public.can_post_area_tip(), public.delete_area_tip(uuid) to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.area_guides enable row level security;
alter table public.area_tips enable row level security;
alter table public.area_tip_votes enable row level security;

revoke all on public.area_guides, public.area_tips, public.area_tip_votes from anon, authenticated;

-- area_guides: public once published (D-012). Admins manage them.
grant select on public.area_guides to anon, authenticated;
grant insert (neighbourhood_id, summary, rent_ranges, commute_notes, safety_notes, halal_food_notes, is_published, updated_by),
  update (summary, rent_ranges, commute_notes, safety_notes, halal_food_notes, is_published, updated_by),
  delete on public.area_guides to authenticated;

create policy area_guides_select_public on public.area_guides
  for select to anon
  using (is_published);
create policy area_guides_select on public.area_guides
  for select to authenticated
  using (is_published or (select public.is_admin()));
create policy area_guides_insert on public.area_guides
  for insert to authenticated
  with check ((select public.is_admin()));
create policy area_guides_update on public.area_guides
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy area_guides_delete on public.area_guides
  for delete to authenticated
  using ((select public.is_admin()));

-- area_tips: everyone reads tips that are not deleted or hidden. Verified buddies post (the trigger checks);
-- the author deletes through delete_area_tip(). Admins hide tips (hidden_at).
grant select on public.area_tips to anon, authenticated;
grant insert (neighbourhood_id, author_id, body) on public.area_tips to authenticated;
grant update (hidden_at) on public.area_tips to authenticated;

create policy area_tips_select_public on public.area_tips
  for select to anon
  using (deleted_at is null and hidden_at is null);
create policy area_tips_select on public.area_tips
  for select to authenticated
  using ((deleted_at is null and hidden_at is null) or (select public.is_admin()));
create policy area_tips_insert on public.area_tips
  for insert to authenticated
  with check (author_id = (select auth.uid()) and (select private.can_post_area_tip()));
create policy area_tips_update on public.area_tips
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- area_tip_votes: a signed-in user adds or removes their own vote and sees only their own votes.
grant select, delete on public.area_tip_votes to authenticated;
grant insert (tip_id, user_id) on public.area_tip_votes to authenticated;

create policy area_tip_votes_select on public.area_tip_votes
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy area_tip_votes_insert on public.area_tip_votes
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy area_tip_votes_delete on public.area_tip_votes
  for delete to authenticated
  using (user_id = (select auth.uid()));
