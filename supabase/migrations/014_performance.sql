-- Tenkara HCM — 014 performance
-- Goals + review cycles + reviews. Admins all; employees manage their own
-- goals and see reviews once shared; managers handle their direct reports.

create function app.my_report_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select id from workers
  where manager_worker_id in (select id from workers where user_id = auth.uid())
$$;

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'on_track'
    check (status in ('on_track','at_risk','behind','done','dropped')),
  progress int not null default 0 check (progress between 0 and 100),
  due_on date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.review_cycles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cycle_id uuid not null references public.review_cycles(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  reviewer_worker_id uuid references public.workers(id) on delete set null,
  rating int check (rating between 1 and 5),
  strengths text,
  growth text,
  summary text,
  status text not null default 'draft' check (status in ('draft','submitted','shared')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cycle_id, worker_id)
);

create index on public.goals (tenant_id, worker_id);
create index on public.reviews (tenant_id, cycle_id);
create index on public.reviews (worker_id);

create trigger audit_reviews after insert or update or delete on public.reviews
  for each row execute function app.log_audit();

alter table public.goals enable row level security;
alter table public.review_cycles enable row level security;
alter table public.reviews enable row level security;

create policy "admins all" on public.goals for all
  using (app.is_admin(tenant_id)) with check (app.is_admin(tenant_id));
create policy "own goals select" on public.goals for select
  using (worker_id in (select app.my_worker_ids()) or worker_id in (select app.my_report_ids()));
create policy "own goals insert" on public.goals for insert
  with check (tenant_id in (select app.user_tenant_ids())
              and (worker_id in (select app.my_worker_ids()) or worker_id in (select app.my_report_ids())));
create policy "own goals update" on public.goals for update
  using (worker_id in (select app.my_worker_ids()) or worker_id in (select app.my_report_ids()));

create policy "admins all" on public.review_cycles for all
  using (app.is_admin(tenant_id)) with check (app.is_admin(tenant_id));
create policy "members read cycles" on public.review_cycles for select
  using (tenant_id in (select app.user_tenant_ids()));

create policy "admins all" on public.reviews for all
  using (app.is_admin(tenant_id)) with check (app.is_admin(tenant_id));
create policy "own shared reviews" on public.reviews for select
  using (worker_id in (select app.my_worker_ids()) and status = 'shared');
create policy "reviewer select" on public.reviews for select
  using (reviewer_worker_id in (select app.my_worker_ids()));
create policy "reviewer insert" on public.reviews for insert
  with check (tenant_id in (select app.user_tenant_ids())
              and reviewer_worker_id in (select app.my_worker_ids())
              and worker_id in (select app.my_report_ids()));
create policy "reviewer update" on public.reviews for update
  using (reviewer_worker_id in (select app.my_worker_ids()));
