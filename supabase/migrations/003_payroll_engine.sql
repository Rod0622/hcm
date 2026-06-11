-- Tenkara HCM — 003 payroll engine foundations
-- Pay groups/calendars, pay codes, effective-dated versioned rule sets,
-- payroll runs with register lines, line items, and exception detection.
-- Tax FILING is out of scope by design; calculations are previewed/exported.

create table public.pay_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_entity_id uuid not null references public.legal_entities(id) on delete cascade,
  name text not null,                       -- 'US Semi-monthly'
  frequency text not null default 'semi_monthly'
    check (frequency in ('monthly','semi_monthly','bi_weekly','weekly')),
  currency text not null,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.pay_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pay_group_id uuid not null references public.pay_groups(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  pay_date date not null,
  status text not null default 'open' check (status in ('open','locked','paid')),
  unique (pay_group_id, period_start)
);

-- Earnings, deductions, taxes, employer contributions.
create table public.pay_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,                        -- 'base_salary','ot_1_5x','ph_sss_ee','us_fed_wh'
  name text not null,
  kind text not null check (kind in ('earning','deduction','tax','employer_contribution')),
  country_code text,                        -- null = global
  taxable boolean not null default true,
  config jsonb not null default '{}',       -- gl account, proration method, caps
  created_at timestamptz not null default now(),
  unique (tenant_id, key)
);

-- ---------- Versioned, effective-dated rules ----------
create table public.payroll_rule_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,                        -- 'ph_statutory_2026','us_overtime_flsa'
  name text not null,
  country_code text,
  legal_entity_id uuid references public.legal_entities(id) on delete cascade,
  scope jsonb not null default '{}',        -- worker types, pay groups it applies to
  created_at timestamptz not null default now(),
  unique (tenant_id, key)
);

create table public.payroll_rule_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rule_set_id uuid not null references public.payroll_rule_sets(id) on delete cascade,
  version int not null,
  effective_from date not null,
  effective_to date,
  -- logic: ordered steps of {pay_code, method: fixed|percent|bracket|formula, params}
  logic jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft','published','superseded')),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (rule_set_id, version)
);

-- ---------- Runs ----------
create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pay_group_id uuid not null references public.pay_groups(id) on delete cascade,
  pay_period_id uuid not null references public.pay_periods(id),
  run_type text not null default 'regular' check (run_type in ('regular','off_cycle','retro','simulation')),
  status text not null default 'draft'
    check (status in ('draft','calculating','in_review','approved','processed','cancelled')),
  totals jsonb not null default '{}',       -- {gross, net, taxes, employer_contributions, employees}
  calculated_at timestamptz,
  submitted_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payroll_run_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  worker_id uuid not null references public.workers(id),
  currency text not null,
  gross numeric(14,2) not null default 0,
  taxes numeric(14,2) not null default 0,
  deductions numeric(14,2) not null default 0,
  employer_contributions numeric(14,2) not null default 0,
  net numeric(14,2) not null default 0,
  status text not null default 'ok' check (status in ('ok','blocked','excluded')),
  notes jsonb not null default '{}',        -- {change: 'New hire' | 'Retro +$340' | 'OT +18.5h'}
  unique (run_id, worker_id)
);

create table public.payroll_line_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  line_id uuid not null references public.payroll_run_lines(id) on delete cascade,
  pay_code_id uuid not null references public.pay_codes(id),
  amount numeric(14,2) not null,
  quantity numeric(10,2),                   -- hours, units
  rate numeric(14,4),
  is_retro boolean not null default false,
  retro_period_id uuid references public.pay_periods(id),
  rule_version_id uuid references public.payroll_rule_versions(id),  -- provenance
  detail jsonb not null default '{}'        -- bracket hit, proration factor, formula inputs
);

-- Exceptions found by the rules engine during calculation.
create table public.payroll_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  worker_id uuid references public.workers(id),
  severity text not null check (severity in ('blocker','warning','info')),
  code text not null,                       -- 'missing_tax_id','negative_net','ot_variance'
  message text not null,
  suggested_action text,
  status text not null default 'open' check (status in ('open','resolved','waived')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index on public.pay_groups (tenant_id);
create index on public.pay_periods (tenant_id, pay_group_id, period_start desc);
create index on public.pay_codes (tenant_id, kind);
create index on public.payroll_rule_sets (tenant_id, country_code);
create index on public.payroll_rule_versions (rule_set_id, effective_from desc);
create index on public.payroll_runs (tenant_id, status);
create index on public.payroll_runs (pay_group_id, created_at desc);
create index on public.payroll_run_lines (run_id);
create index on public.payroll_run_lines (tenant_id, worker_id);
create index on public.payroll_line_items (line_id);
create index on public.payroll_exceptions (tenant_id, run_id, status);

-- ---------- Audit ----------
create trigger audit_payroll_runs after insert or update or delete on public.payroll_runs
  for each row execute function app.log_audit();
create trigger audit_rule_versions after insert or update or delete on public.payroll_rule_versions
  for each row execute function app.log_audit();

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array[
    'pay_groups','pay_periods','pay_codes','payroll_rule_sets','payroll_rule_versions',
    'payroll_runs','payroll_run_lines','payroll_line_items','payroll_exceptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "tenant members all" on public.%I for all
         using (tenant_id in (select app.user_tenant_ids()))
         with check (tenant_id in (select app.user_tenant_ids()))', t);
  end loop;
end $$;
