-- Tenkara HCM — 010 profile editing & time tracking
-- Avatar storage (public bucket, self-service upload), self-service person
-- updates (own phone/photo), and time_entries for clock in/out + breaks.
-- time_entries carries a source + external_id so Time Doctor worklogs can be
-- synced into the same table idempotently.

alter table public.people add column avatar_path text;

create function app.my_person_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$ select person_id from workers where user_id = auth.uid() $$;

-- Employees may update their own person record (phone, preferred name, photo).
create policy "own person update" on public.people for update
  using (id in (select app.my_person_ids()))
  with check (id in (select app.my_person_ids()));

-- ---------- Time tracking ----------
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  kind text not null default 'work' check (kind in ('work','break')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  source text not null default 'app' check (source in ('app','timedoctor','manual')),
  external_id text,                       -- Time Doctor worklog id for idempotent sync
  note text,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);

create index on public.time_entries (tenant_id, worker_id, started_at desc);
create index on public.time_entries (tenant_id, started_at desc);
create unique index time_entries_external_key
  on public.time_entries (tenant_id, external_id) where external_id is not null;

alter table public.time_entries enable row level security;

create policy "admins all" on public.time_entries for all
  using (app.is_admin(tenant_id))
  with check (app.is_admin(tenant_id));
create policy "own entries select" on public.time_entries for select
  using (worker_id in (select app.my_worker_ids()));
create policy "own entries insert" on public.time_entries for insert
  with check (tenant_id in (select app.user_tenant_ids())
              and worker_id in (select app.my_worker_ids()));
create policy "own entries update" on public.time_entries for update
  using (worker_id in (select app.my_worker_ids()));

-- ---------- Avatars ----------
-- Public bucket: anyone can view; paths are {tenant_id}/{person_id}/{file}.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars','avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars admin write" on storage.objects for insert
  with check (bucket_id = 'avatars' and app.is_admin((storage.foldername(name))[1]::uuid));
create policy "avatars admin update" on storage.objects for update
  using (bucket_id = 'avatars' and app.is_admin((storage.foldername(name))[1]::uuid));
create policy "avatars admin delete" on storage.objects for delete
  using (bucket_id = 'avatars' and app.is_admin((storage.foldername(name))[1]::uuid));
create policy "avatars own write" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[2]::uuid in (select app.my_person_ids()));
create policy "avatars own update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[2]::uuid in (select app.my_person_ids()));
