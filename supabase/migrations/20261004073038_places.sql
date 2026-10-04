-- Phase 5 / M017 places directory (PRODUCT_SPEC §8.1): Shia masjids, imambargahs, community centres and
-- everyday places. Admin-managed and verified; users suggest new places or corrections.
-- Public (D-012): signed-out visitors can read verified places.

create type public.place_type as enum (
  'shia_masjid', 'imambargah', 'community_center', 'islamic_school',
  'halal_restaurant', 'halal_grocery', 'hospital_clinic', 'transit_station'
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 150),
  place_type public.place_type not null,
  address text check (char_length(address) <= 300),
  location extensions.geography(point, 4326) not null,
  city_id uuid not null references public.cities (id) on delete restrict,
  neighbourhood_id uuid references public.neighbourhoods (id) on delete set null,
  -- Contact details of institutions are public (PRODUCT_SPEC §8.1); never a private person's number.
  phone text check (char_length(phone) <= 30),
  website text check (website ~ '^https?://' and char_length(website) <= 300),
  -- Prayer / majlis / opening times as free text.
  timings text check (char_length(timings) <= 1000),
  notes text check (char_length(notes) <= 2000),
  is_verified boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index places_location_gix on public.places using gist (location);
create index places_city_type_idx on public.places (city_id, place_type);
create index places_neighbourhood_id_idx on public.places (neighbourhood_id);
create index places_created_by_idx on public.places (created_by);

create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

create trigger places_audit after insert or update or delete on public.places
  for each row execute function public.audit_admin_change();

create table public.place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  -- Path in the public place-photos bucket: '{place_id}/{uuid}.{ext}'.
  storage_path text not null check (char_length(storage_path) <= 300),
  position smallint not null default 0 check (position between 0 and 19),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, storage_path)
);

create trigger place_photos_set_updated_at
  before update on public.place_photos
  for each row execute function public.set_updated_at();

-- A user's suggestion: a new place (place_id null) or a correction to an existing one.
-- payload holds the proposed fields (validated by the app); admins review it in the admin panel.
create table public.place_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid references public.places (id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 8192),
  note text check (char_length(note) <= 1000),
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index place_suggestions_user_id_idx on public.place_suggestions (user_id, created_at desc);
create index place_suggestions_place_id_idx on public.place_suggestions (place_id);
create index place_suggestions_queue_idx on public.place_suggestions (status, created_at);
create index place_suggestions_reviewed_by_idx on public.place_suggestions (reviewed_by);

create trigger place_suggestions_set_updated_at
  before update on public.place_suggestions
  for each row execute function public.set_updated_at();

-- Suggestion rules: finished onboarding, 10 a day.
create or replace function public.place_suggestions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = new.user_id and p.onboarding_completed_at is not null and p.suspended_at is null
  ) then
    raise exception 'onboarding_required' using errcode = 'P0001';
  end if;
  perform public.check_rate_limit('place_suggestion', 10, interval '1 day');
  return new;
end;
$$;

revoke execute on function public.place_suggestions_before_insert() from public, anon, authenticated;

create trigger place_suggestions_before_insert
  before insert on public.place_suggestions
  for each row execute function public.place_suggestions_before_insert();

-- RLS ---------------------------------------------------------------------------

alter table public.places enable row level security;
alter table public.place_photos enable row level security;
alter table public.place_suggestions enable row level security;

revoke all on public.places, public.place_photos, public.place_suggestions from anon, authenticated;

-- places: everyone reads verified, non-hidden places. Admins manage them.
grant select on public.places to anon, authenticated;
grant insert (name, place_type, address, location, city_id, neighbourhood_id, phone, website, timings, notes,
  is_verified, created_by) on public.places to authenticated;
grant update (name, place_type, address, location, city_id, neighbourhood_id, phone, website, timings, notes,
  is_verified, hidden_at) on public.places to authenticated;
grant delete on public.places to authenticated;

create policy places_select_public on public.places
  for select to anon
  using (is_verified and hidden_at is null);
create policy places_select on public.places
  for select to authenticated
  using ((is_verified and hidden_at is null) or (select public.is_admin()));
create policy places_insert on public.places
  for insert to authenticated
  with check ((select public.is_admin()));
create policy places_update on public.places
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy places_delete on public.places
  for delete to authenticated
  using ((select public.is_admin()));

-- place_photos: visible whenever the place is visible (its RLS applies in the subquery). Admins manage them.
grant select on public.place_photos to anon, authenticated;
grant insert (place_id, storage_path, position), update (position), delete on public.place_photos to authenticated;

create policy place_photos_select_public on public.place_photos
  for select to anon
  using (exists (select 1 from public.places p where p.id = place_photos.place_id));
create policy place_photos_select on public.place_photos
  for select to authenticated
  using (exists (select 1 from public.places p where p.id = place_photos.place_id));
create policy place_photos_insert on public.place_photos
  for insert to authenticated
  with check ((select public.is_admin()));
create policy place_photos_update on public.place_photos
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy place_photos_delete on public.place_photos
  for delete to authenticated
  using ((select public.is_admin()));

-- place_suggestions: the author inserts and reads their own; admins read and decide.
grant select on public.place_suggestions to authenticated;
grant insert (user_id, place_id, payload, note) on public.place_suggestions to authenticated;
grant update (status, reviewed_by, reviewed_at, review_note) on public.place_suggestions to authenticated;

create policy place_suggestions_select on public.place_suggestions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy place_suggestions_insert on public.place_suggestions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy place_suggestions_update on public.place_suggestions
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Storage: public "place-photos" bucket, '{place_id}/{uuid}.{ext}'. Admin-only writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-photos', 'place-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy place_photos_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'place-photos' and (select public.is_admin()));

create policy place_photos_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'place-photos' and (select public.is_admin()));
