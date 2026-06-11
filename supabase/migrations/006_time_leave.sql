-- Tenkara HCM — 006 time & leave
-- Self-service leave: accrual policies per country (PH accrues 0.5 PTO
-- days/month), leave requests routed to the worker's manager, and in-app
-- notifications on request + decision. Balances are computed, not stored:
-- completed months of service × monthly accrual − approved leave days.

-- Link workers to auth users for self-service (my balance, my requests).
alter table public.workers add column user_id uuid references auth.users(id) on delete set null;
create index on public.workers (user_id);

-- ---------- Policies ----------
create table public.leave_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  country_code text not null,              -- applies via legal_entities.country_code
  leave_type text not null default 'pto' check (leave_type in ('pto','sick')),
  name text not null,
  accrual_per_month numeric(5,2) not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, country_code, leave_type)
);

-- ---------- Requests ----------
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  leave_type text not null default 'pto' check (leave_type in ('pto','sick','unpaid')),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  days numeric(5,2) not null check (days > 0),
  reason text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  approver_worker_id uuid references public.workers(id) on delete set null,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.leave_requests (tenant_id, worker_id, created_at desc);
create index on public.leave_requests (tenant_id, approver_worker_id) where status = 'pending';

-- ---------- Computed balances ----------
-- Months of completed service × policy accrual − approved days; pending shown
-- separately so the UI can display "available after pending".
create view public.pto_balances
with (security_invoker = true) as
select
  w.id as worker_id,
  w.tenant_id,
  w.user_id,
  p.full_name,
  le.country_code,
  w.hired_on,
  lp.accrual_per_month,
  round(greatest(0,
    extract(year from age(current_date, coalesce(w.hired_on, current_date))) * 12
    + extract(month from age(current_date, coalesce(w.hired_on, current_date)))
  )::numeric * lp.accrual_per_month, 2) as accrued,
  coalesce(used.days, 0) as used,
  coalesce(pend.days, 0) as pending,
  round(greatest(0,
    extract(year from age(current_date, coalesce(w.hired_on, current_date))) * 12
    + extract(month from age(current_date, coalesce(w.hired_on, current_date)))
  )::numeric * lp.accrual_per_month, 2) - coalesce(used.days, 0) as balance
from public.workers w
join public.people p on p.id = w.person_id
join public.legal_entities le on le.id = w.legal_entity_id
join public.leave_policies lp
  on lp.tenant_id = w.tenant_id and lp.country_code = le.country_code and lp.leave_type = 'pto'
left join lateral (
  select sum(days) as days from public.leave_requests lr
  where lr.worker_id = w.id and lr.leave_type = 'pto' and lr.status = 'approved'
) used on true
left join lateral (
  select sum(days) as days from public.leave_requests lr
  where lr.worker_id = w.id and lr.leave_type = 'pto' and lr.status = 'pending'
) pend on true
where w.status in ('active','onboarding');

-- ---------- Notifications ----------
create function app.notify_leave_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  approver_user uuid;
  requester text;
begin
  select user_id into approver_user from workers where id = new.approver_worker_id;
  select p.full_name into requester
    from workers w join people p on p.id = w.person_id where w.id = new.worker_id;
  if approver_user is not null then
    insert into notifications (tenant_id, recipient_user_id, channel, payload, status, sent_at)
    values (new.tenant_id, approver_user, 'in_app',
      jsonb_build_object(
        'kind', 'leave_approval',
        'title', coalesce(requester, 'An employee') || ' requested ' || trim_scale(new.days) || ' day(s) of ' || upper(new.leave_type),
        'body', new.start_date || ' → ' || new.end_date || coalesce(' · ' || nullif(new.reason, ''), ''),
        'link', '/time',
        'request_id', new.id),
      'sent', now());
  end if;
  return new;
end $$;

create trigger notify_leave_request after insert on public.leave_requests
  for each row execute function app.notify_leave_request();

create function app.notify_leave_decision()
returns trigger language plpgsql security definer set search_path = public as $$
declare requester_user uuid;
begin
  if new.status in ('approved','rejected') and old.status = 'pending' then
    select user_id into requester_user from workers where id = new.worker_id;
    if requester_user is not null then
      insert into notifications (tenant_id, recipient_user_id, channel, payload, status, sent_at)
      values (new.tenant_id, requester_user, 'in_app',
        jsonb_build_object(
          'kind', 'leave_decision',
          'title', 'Your ' || upper(new.leave_type) || ' request was ' || new.status,
          'body', new.start_date || ' → ' || new.end_date || ' (' || trim_scale(new.days) || ' day(s))',
          'link', '/time',
          'request_id', new.id),
        'sent', now());
    end if;
  end if;
  return new;
end $$;

create trigger notify_leave_decision after update on public.leave_requests
  for each row execute function app.notify_leave_decision();

-- ---------- Audit ----------
create trigger audit_leave_requests after insert or update or delete on public.leave_requests
  for each row execute function app.log_audit();

-- ---------- RLS ----------
alter table public.leave_policies enable row level security;
alter table public.leave_requests enable row level security;

do $$
declare t text;
begin
  foreach t in array array['leave_policies','leave_requests'] loop
    execute format(
      'create policy "tenant members all" on public.%I for all
         using (tenant_id in (select app.user_tenant_ids()))
         with check (tenant_id in (select app.user_tenant_ids()))', t);
  end loop;
end $$;
