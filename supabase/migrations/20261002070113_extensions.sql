-- M001 extensions
-- PostGIS for geo search, pg_cron for scheduled jobs, pg_net for cron -> Edge Function calls,
-- pg_trgm for fuzzy skill search, btree_gist for exclusion constraints (mentor session overlap).

create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists btree_gist with schema extensions;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
