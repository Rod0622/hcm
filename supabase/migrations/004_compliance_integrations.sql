-- Tenkara HCM — 004 compliance engine + integrations
-- Country/entity compliance packs, requirements, per-subject statuses,
-- policy acknowledgments, integration accounts and sync jobs.

-- A pack bundles every statutory requirement for a country + legal entity.
create table public.compliance_packs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_entity_id uuid references public.legal_entities(id) on delete cascade,
  country_code text not null,
  name text not null,                       -- 'United States — federal core'
  version text not null default '2026.1',
  status text not null default 'active' check (status in ('active','draft','archived')),
  created_at timestamptz not null default now()
);

create table public.compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pack_id uuid not null references public.compliance_packs(id) on delete cascade,
  key text not null,                        -- 'us_i9','ph_tin','sg_cpf_submission'
  name text not null,
  kind text not null
    check (kind in ('required_field','document','deadline','registration','acknowledgment','remittance')),
  applies_to text not null default 'worker' check (applies_to in ('worker','legal_entity')),
  severity text not null default 'high' check (severity in ('blocker','high','low','scheduled')),
  blocks_payroll boolean not null default false,
  recurrence text,                          -- RRULE-ish: 'monthly','quarterly','annual', null = once
  config jsonb not null default '{}',       -- which field/document/form, lead time, agency
  created_at timestamptz not null default now(),
  unique (pack_id, key)
);

-- Status of one requirement for one subject (a worker or an entity).
create table public.compliance_statuses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requirement_id uuid not null references public.compliance_requirements(id) on delete cascade,
  subject_type text not null check (subject_type in ('worker','legal_entity')),
  subject_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending','satisfied','overdue','waived','blocked')),
  due_on date,
  satisfied_at timestamptz,
  owner_user_id uuid references auth.users(id),
  evidence jsonb not null default '{}',     -- document ids, filing receipts, screenshots
  created_at timestamptz not null default now(),
  unique (requirement_id, subject_type, subject_id, due_on)
);

create table public.policy_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','acknowledged','declined')),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_id, worker_id)
);

-- ---------- Integrations ----------
create table public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,                   -- 'slack','google_workspace','microsoft_365','github'
  status text not null default 'disconnected'
    check (status in ('connected','disconnected','error','pending')),
  config jsonb not null default '{}',       -- non-secret settings, mapping
  secret_ref text,                          -- reference into Vault / secrets manager (never the secret)
  connected_by uuid references auth.users(id),
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid not null references public.integration_accounts(id) on delete cascade,
  kind text not null,                       -- 'provision_user','revoke_access','directory_sync'
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed','retrying','cancelled')),
  attempt int not null default 1,
  payload jsonb not null default '{}',
  result jsonb not null default '{}',
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index on public.compliance_packs (tenant_id, country_code);
create index on public.compliance_requirements (tenant_id, pack_id);
create index on public.compliance_statuses (tenant_id, status, due_on);
create index on public.compliance_statuses (subject_type, subject_id);
create index on public.policy_acknowledgments (tenant_id, worker_id, status);
create index on public.integration_accounts (tenant_id);
create index on public.sync_jobs (tenant_id, integration_id, status);

-- ---------- Audit ----------
create trigger audit_compliance_statuses after insert or update or delete on public.compliance_statuses
  for each row execute function app.log_audit();
create trigger audit_integration_accounts after insert or update or delete on public.integration_accounts
  for each row execute function app.log_audit();

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array[
    'compliance_packs','compliance_requirements','compliance_statuses',
    'policy_acknowledgments','integration_accounts','sync_jobs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "tenant members all" on public.%I for all
         using (tenant_id in (select app.user_tenant_ids()))
         with check (tenant_id in (select app.user_tenant_ids()))', t);
  end loop;
end $$;
