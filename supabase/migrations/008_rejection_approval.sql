-- Tenkara HCM — 008 rejection approval (maker-checker)
-- Bulk rejection emails no longer fire immediately: requesting them creates a
-- pending batch that an owner/admin must approve. Candidates who move to the
-- offer stage between request and approval are excluded at execution time —
-- covering the case where the first-choice candidate declines the offer and
-- another applicant from the pool gets it instead.

create table public.rejection_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  opening_id uuid not null references public.job_openings(id) on delete cascade,
  application_ids uuid[] not null,         -- snapshot at request time; re-checked on approval
  status text not null default 'pending_approval'
    check (status in ('pending_approval','approved','cancelled')),
  requested_by uuid references auth.users(id),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.rejection_batches (tenant_id, opening_id) where status = 'pending_approval';

-- Notify every owner/admin when a batch needs approval.
create function app.notify_rejection_batch()
returns trigger language plpgsql security definer set search_path = public as $$
declare opening_title text;
begin
  select title into opening_title from job_openings where id = new.opening_id;
  insert into notifications (tenant_id, recipient_user_id, channel, payload, status, sent_at)
  select new.tenant_id, tu.user_id, 'in_app',
    jsonb_build_object(
      'kind', 'rejection_approval',
      'title', 'Rejection emails awaiting approval — ' || coalesce(opening_title, 'opening'),
      'body', array_length(new.application_ids, 1) || ' candidate(s) will be notified we went with another candidate once approved.',
      'link', '/recruiting/' || new.opening_id,
      'batch_id', new.id),
    'sent', now()
  from tenant_users tu
  where tu.tenant_id = new.tenant_id and tu.role in ('owner','admin');
  return new;
end $$;

create trigger notify_rejection_batch after insert on public.rejection_batches
  for each row execute function app.notify_rejection_batch();

create trigger audit_rejection_batches after insert or update or delete on public.rejection_batches
  for each row execute function app.log_audit();

alter table public.rejection_batches enable row level security;
create policy "tenant members all" on public.rejection_batches for all
  using (tenant_id in (select app.user_tenant_ids()))
  with check (tenant_id in (select app.user_tenant_ids()));
