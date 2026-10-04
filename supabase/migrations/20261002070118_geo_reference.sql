-- M003 geo reference: cities and neighbourhoods (public reference data, admin-managed).
-- Admin write policies are added in M004 once has_role()/is_admin() exist.

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  state text not null,
  country_code char(2) not null default 'IN',
  center extensions.geography(point, 4326) not null,
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cities_center_gix on public.cities using gist (center);

create trigger cities_set_updated_at
  before update on public.cities
  for each row execute function public.set_updated_at();

create table public.neighbourhoods (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  center extensions.geography(point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create index neighbourhoods_center_gix on public.neighbourhoods using gist (center);

create trigger neighbourhoods_set_updated_at
  before update on public.neighbourhoods
  for each row execute function public.set_updated_at();

-- RLS: everyone (including signed-out visitors) can read.
alter table public.cities enable row level security;
alter table public.neighbourhoods enable row level security;

revoke all on public.cities, public.neighbourhoods from anon, authenticated;
grant select on public.cities, public.neighbourhoods to anon, authenticated;

create policy cities_select on public.cities
  for select to anon, authenticated
  using (true);

create policy neighbourhoods_select on public.neighbourhoods
  for select to anon, authenticated
  using (true);

-- Launch cities (D-007) and starter neighbourhoods. Centers are approximate.
insert into public.cities (name, slug, state, center) values
  ('Mumbai',    'mumbai',    'Maharashtra',   extensions.st_point(72.8777, 19.0760, 4326)::extensions.geography),
  ('Delhi NCR', 'delhi-ncr', 'Delhi',         extensions.st_point(77.2090, 28.6139, 4326)::extensions.geography),
  ('Bengaluru', 'bengaluru', 'Karnataka',     extensions.st_point(77.5946, 12.9716, 4326)::extensions.geography),
  ('Hyderabad', 'hyderabad', 'Telangana',     extensions.st_point(78.4867, 17.3850, 4326)::extensions.geography),
  ('Lucknow',   'lucknow',   'Uttar Pradesh', extensions.st_point(80.9462, 26.8467, 4326)::extensions.geography);

insert into public.neighbourhoods (city_id, name, slug, center)
select c.id, n.name, n.slug, extensions.st_point(n.lng, n.lat, 4326)::extensions.geography
from (values
  ('mumbai',    'Andheri West',     'andheri-west',     72.8296, 19.1364),
  ('mumbai',    'Bandra West',      'bandra-west',      72.8347, 19.0596),
  ('mumbai',    'Kurla',            'kurla',            72.8826, 19.0726),
  ('mumbai',    'Mira Road',        'mira-road',        72.8697, 19.2813),
  ('mumbai',    'Dongri',           'dongri',           72.8380, 18.9600),
  ('mumbai',    'Byculla',          'byculla',          72.8333, 18.9790),
  ('delhi-ncr', 'Jor Bagh',         'jor-bagh',         77.2167, 28.5880),
  ('delhi-ncr', 'Jamia Nagar',      'jamia-nagar',      77.2860, 28.5620),
  ('delhi-ncr', 'Lajpat Nagar',     'lajpat-nagar',     77.2433, 28.5677),
  ('delhi-ncr', 'Gurugram',         'gurugram',         77.0266, 28.4595),
  ('delhi-ncr', 'Noida',            'noida',            77.3649, 28.6270),
  ('bengaluru', 'Koramangala',      'koramangala',      77.6245, 12.9352),
  ('bengaluru', 'HSR Layout',       'hsr-layout',       77.6387, 12.9116),
  ('bengaluru', 'Whitefield',       'whitefield',       77.7500, 12.9698),
  ('bengaluru', 'Frazer Town',      'frazer-town',      77.6150, 12.9980),
  ('bengaluru', 'Electronic City',  'electronic-city',  77.6701, 12.8399),
  ('hyderabad', 'Old City',         'old-city',         78.4747, 17.3616),
  ('hyderabad', 'Mehdipatnam',      'mehdipatnam',      78.4382, 17.3959),
  ('hyderabad', 'Tolichowki',       'tolichowki',       78.4115, 17.3976),
  ('hyderabad', 'Gachibowli',       'gachibowli',       78.3489, 17.4401),
  ('hyderabad', 'HITEC City',       'hitec-city',       78.3772, 17.4435),
  ('lucknow',   'Old Lucknow',      'old-lucknow',      80.9130, 26.8690),
  ('lucknow',   'Hazratganj',       'hazratganj',       80.9462, 26.8500),
  ('lucknow',   'Gomti Nagar',      'gomti-nagar',      80.9910, 26.8500),
  ('lucknow',   'Aliganj',          'aliganj',          80.9420, 26.8920),
  ('lucknow',   'Indira Nagar',     'indira-nagar',     80.9990, 26.8790)
) as n (city_slug, name, slug, lng, lat)
join public.cities c on c.slug = n.city_slug;
