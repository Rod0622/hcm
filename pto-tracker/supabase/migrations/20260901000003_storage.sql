-- PTO Tracker — storage buckets and policies.
--
--  proofs         private; employees upload supporting files (e.g. med
--                 certs) under proofs/<their uid>/...; admins can read all.
--  announcements  public-read; only admins upload media for announcements.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('proofs', 'proofs', false, 10485760,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']),
  ('announcements', 'announcements', true, 52428800,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "proofs: upload into own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "proofs: read own or admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'proofs'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

create policy "proofs: delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "announcements media: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'announcements' and public.is_admin());

create policy "announcements media: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'announcements' and public.is_admin());

create policy "announcements media: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'announcements' and public.is_admin());
