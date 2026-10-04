-- Phase 2 storage: private "cvs" bucket and public "company-logos" bucket.
-- Paths start with the owning id so policies can use storage.foldername(name).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cvs', 'cvs', false, 5242880, array['application/pdf']),
  ('company-logos', 'company-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Folder name -> company membership, tolerant of malformed paths.
create or replace function private.is_company_member_path(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.is_company_member(p_folder::uuid)
    else false
  end;
$$;

revoke execute on function private.is_company_member_path(text) from public, anon;
grant execute on function private.is_company_member_path(text) to authenticated;

-- cvs: '{user_id}/{uuid}.pdf'. The owner uploads, reads and deletes.
-- An employer can read a CV only while it is attached to a live application to one of their jobs
-- (the server action then issues a signed URL valid for 10 minutes with the employer's own session).
create policy cvs_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy cvs_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.cvs c where c.storage_path = name and private.can_view_cv(c.id))
    )
  );

create policy cvs_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- company-logos: '{company_id}/{uuid}.{ext}'. Public read through the public URL (no select policy, so no listing).
create policy company_logos_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-logos' and private.is_company_member_path((storage.foldername(name))[1]));

create policy company_logos_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-logos' and private.is_company_member_path((storage.foldername(name))[1]));
