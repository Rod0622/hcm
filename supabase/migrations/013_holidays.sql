-- Tenkara HCM — 013 holidays
-- Country holiday calendar: excluded from leave-day counts; PH 'regular'
-- vs 'special non-working' distinction kept for future pay multipliers.
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  country_code text not null,
  holiday_date date not null,
  name text not null,
  kind text not null default 'regular' check (kind in ('regular','special')),
  created_at timestamptz not null default now(),
  unique (tenant_id, country_code, holiday_date, name)
);
create index on public.holidays (tenant_id, country_code, holiday_date);

alter table public.holidays enable row level security;
create policy "admins all" on public.holidays for all
  using (app.is_admin(tenant_id)) with check (app.is_admin(tenant_id));
create policy "members read" on public.holidays for select
  using (tenant_id in (select app.user_tenant_ids()));
