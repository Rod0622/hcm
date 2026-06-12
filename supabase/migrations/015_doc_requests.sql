-- Tenkara HCM — 015 self-service document requests
-- Employee files a request (COE etc), HR is notified, fulfills with an
-- uploaded file in the private hr-docs bucket, employee is notified and can
-- download their own documents.

create table public.doc_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  kind text not null default 'coe'
    check (kind in ('coe','coe_with_salary','payslip_copy','other')),
  details text,
  status text not null default 'pending' check (status in ('pending','ready','rejected')),
  file_path text,
  file_name text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.doc_requests (tenant_id, status);
create index on public.doc_requests (worker_id);

alter table public.doc_requests enable row level security;
create policy "admins all" on public.doc_requests for all
  using (app.is_admin(tenant_id)) with check (app.is_admin(tenant_id));
create policy "own requests select" on public.doc_requests for select
  using (worker_id in (select app.my_worker_ids()));
create policy "own requests insert" on public.doc_requests for insert
  with check (tenant_id in (select app.user_tenant_ids())
              and worker_id in (select app.my_worker_ids()));

create function app.notify_doc_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare requester text;
begin
  select p.full_name into requester
    from workers w join people p on p.id = w.person_id where w.id = new.worker_id;
  insert into notifications (tenant_id, recipient_user_id, channel, payload, status, sent_at)
  select new.tenant_id, tu.user_id, 'in_app',
    jsonb_build_object(
      'kind', 'doc_request',
      'title', coalesce(requester, 'An employee') || ' requested a document (' || new.kind || ')',
      'body', coalesce(new.details, 'No details provided'),
      'link', '/requests',
      'request_id', new.id),
    'sent', now()
  from tenant_users tu
  where tu.tenant_id = new.tenant_id and tu.role in ('owner','admin','hr');
  return new;
end $$;

create trigger notify_doc_request after insert on public.doc_requests
  for each row execute function app.notify_doc_request();

create function app.notify_doc_decision()
returns trigger language plpgsql security definer set search_path = public as $$
declare requester_user uuid;
begin
  if new.status in ('ready','rejected') and old.status = 'pending' then
    select user_id into requester_user from workers where id = new.worker_id;
    if requester_user is not null then
      insert into notifications (tenant_id, recipient_user_id, channel, payload, status, sent_at)
      values (new.tenant_id, requester_user, 'in_app',
        jsonb_build_object(
          'kind', 'doc_decision',
          'title', 'Your document request is ' || new.status,
          'body', new.kind || case when new.status = 'ready' then ' — download it from Requests' else '' end,
          'link', '/requests',
          'request_id', new.id),
        'sent', now());
    end if;
  end if;
  return new;
end $$;

create trigger notify_doc_decision after update on public.doc_requests
  for each row execute function app.notify_doc_decision();

insert into storage.buckets (id, name, public, file_size_limit)
values ('hr-docs','hr-docs', false, 10485760)
on conflict (id) do nothing;

create policy "hrdocs admin all" on storage.objects for all
  using (bucket_id = 'hr-docs' and app.is_admin((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'hr-docs' and app.is_admin((storage.foldername(name))[1]::uuid));
create policy "hrdocs own read" on storage.objects for select
  using (bucket_id = 'hr-docs' and (storage.foldername(name))[2]::uuid in (select app.my_worker_ids()));
