-- Phase 4 fix: renewing must not make a listing live without an address (set_listing_status already checks this).

create or replace function private.renew_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.flat_listings l
    where l.id = p_listing_id and l.lister_id = (select auth.uid()) and l.deleted_at is null and l.status <> 'rented'
  ) then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.flat_listing_private p where p.listing_id = p_listing_id) then
    raise exception 'address_required' using errcode = 'P0001';
  end if;

  update public.flat_listings
  set status = 'active', expires_at = now() + interval '30 days', renewed_at = now()
  where id = p_listing_id;
end;
$$;
