-- Tenkara HCM — 001 core platform
-- Tenants, membership, people/workers, org structure, custom fields,
-- documents, immutable audit log. RLS: tenant membership via app.user_tenant_ids().

create extension if not exists pgcrypto;
create schema if not exists app;

-- ---------- Tenancy ----------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.tenant_users (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner','admin','hr','finance','manager','member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create function app.user_tenant_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$ select tenant_id from public.tenant_users where user_id = auth.uid() $$;

-- ---------- Org structure ----------
create table public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  country_code text not null,           -- ISO 3166-1 alpha-2
  currency text not null,               -- ISO 4217
  tax_registrations jsonb not null default '{}',
  payroll_settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_entity_id uuid references public.legal_entities(id) on delete set null,
  name text not null,
  country_code text not null,
  region text,
  timezone text,
  created_at timestamptz not null default now()
);

create table public.org_units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  parent_id uuid references public.org_units(id) on delete set null,
  kind text not null default 'department'
    check (kind in ('company','business_unit','department','team','cost_center','region')),
  name text not null,
  code text,
  created_at timestamptz not null default now()
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  org_unit_id uuid references public.org_units(id) on delete set null,
  title text not null,
  job_family text,
  level text,
  comp_band jsonb not null default '{}',  -- {currency, min, mid, max}
  created_at timestamptz not null default now()
);

-- ---------- People & workers ----------
-- Person = human identity. Worker = an employment relationship of a person.
create table public.people (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  preferred_name text,
  email text,
  phone text,
  date_of_birth date,
  personal jsonb not null default '{}',   -- address, emergency contact, ids
  created_at timestamptz not null default now()
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  legal_entity_id uuid references public.legal_entities(id) on delete set null,
  position_id uuid references public.positions(id) on delete set null,
  org_unit_id uuid references public.org_units(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  manager_worker_id uuid references public.workers(id) on delete set null,
  employee_number text,
  worker_type text not null default 'employee'
    check (worker_type in ('employee','contractor','intern','agency','alumnus')),
  status text not null default 'onboarding'
    check (status in ('onboarding','active','on_leave','offboarding','terminated')),
  work_email text,
  hired_on date,
  terminated_on date,
  custom jsonb not null default '{}',     -- denormalized custom-field cache
  created_at timestamptz not null default now(),
  unique (tenant_id, employee_number)
);

-- Effective-dated compensation history (one row per change, never updated in place).
create table public.compensation_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  effective_date date not null,
  event text not null default 'hire'
    check (event in ('hire','merit','promotion','adjustment','equity_grant','demotion','correction')),
  base_amount numeric(14,2),
  currency text,
  frequency text default 'annual'
    check (frequency in ('annual','monthly','semi_monthly','bi_weekly','weekly','daily','hourly')),
  components jsonb not null default '{}', -- equity, allowances, bonus targets
  reason text,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- Configuration: objects & custom fields ----------
create table public.object_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,                      -- 'employee', 'worker', 'equipment'
  label text not null,
  source text not null default 'custom' check (source in ('system','custom')),
  config jsonb not null default '{}',     -- layouts, sections
  created_at timestamptz not null default now(),
  unique (tenant_id, key)
);

create table public.field_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  object_id uuid not null references public.object_definitions(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null
    check (field_type in ('text','number','date','boolean','select','multi_select','contact','reference','currency','file')),
  required text not null default 'no' check (required in ('no','yes','conditional')),
  visibility text not null default 'hr' check (visibility in ('everyone','hr','finance','manager_chain','self')),
  options jsonb not null default '[]',
  validation jsonb not null default '{}',
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, object_id, key)
);

create table public.field_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  field_id uuid not null references public.field_definitions(id) on delete cascade,
  record_id uuid not null,                -- id of the row in the object's table
  value jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (tenant_id, field_id, record_id)
);

-- ---------- Documents ----------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  name text not null,
  kind text not null default 'other'
    check (kind in ('contract','government','tax','policy','id','certification','generated','other')),
  status text not null default 'pending'
    check (status in ('pending','sent','signed','verified','filed','expired','rejected')),
  storage_path text,                      -- Supabase Storage object path
  expires_on date,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- Immutable audit log ----------
create table public.audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid,
  actor_label text not null default 'system',  -- 'Ana Reyes', 'Workflow', 'Rules engine'
  action text not null,                        -- 'worker.updated', 'payroll.blocked'
  object_type text,
  object_id text,
  old_data jsonb,
  new_data jsonb,
  source text not null default 'app',          -- 'app','workflow','rules_engine','api','config_studio'
  created_at timestamptz not null default now()
);

-- Generic row-change audit trigger for sensitive tables.
create function app.log_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_events (tenant_id, actor_user_id, actor_label, action, object_type, object_id, old_data, new_data, source)
  values (
    coalesce(new.tenant_id, old.tenant_id),
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'system'),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(new.id::text, old.id::text),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    'app'
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_workers after insert or update or delete on public.workers
  for each row execute function app.log_audit();
create trigger audit_compensation after insert or update or delete on public.compensation_records
  for each row execute function app.log_audit();
create trigger audit_field_definitions after insert or update or delete on public.field_definitions
  for each row execute function app.log_audit();

-- ---------- Indexes ----------
create index on public.legal_entities (tenant_id);
create index on public.locations (tenant_id);
create index on public.org_units (tenant_id, parent_id);
create index on public.positions (tenant_id, org_unit_id);
create index on public.people (tenant_id);
create index on public.workers (tenant_id, status);
create index on public.workers (person_id);
create index on public.workers (manager_worker_id);
create index on public.compensation_records (tenant_id, worker_id, effective_date desc);
create index on public.field_definitions (tenant_id, object_id);
create index on public.field_values (tenant_id, record_id);
create index on public.documents (tenant_id, worker_id);
create index on public.documents (tenant_id, expires_on);
create index on public.audit_events (tenant_id, created_at desc);
create index on public.audit_events (tenant_id, object_type, object_id);

-- ---------- RLS ----------
alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;
alter table public.legal_entities enable row level security;
alter table public.locations enable row level security;
alter table public.org_units enable row level security;
alter table public.positions enable row level security;
alter table public.people enable row level security;
alter table public.workers enable row level security;
alter table public.compensation_records enable row level security;
alter table public.object_definitions enable row level security;
alter table public.field_definitions enable row level security;
alter table public.field_values enable row level security;
alter table public.documents enable row level security;
alter table public.audit_events enable row level security;

create policy "members read tenant" on public.tenants
  for select using (id in (select app.user_tenant_ids()));
create policy "self memberships" on public.tenant_users
  for select using (user_id = auth.uid() or tenant_id in (select app.user_tenant_ids()));

do $$
declare t text;
begin
  foreach t in array array[
    'legal_entities','locations','org_units','positions','people','workers',
    'compensation_records','object_definitions','field_definitions','field_values','documents'
  ] loop
    execute format(
      'create policy "tenant members all" on public.%I for all
         using (tenant_id in (select app.user_tenant_ids()))
         with check (tenant_id in (select app.user_tenant_ids()))', t);
  end loop;
end $$;

-- Audit log: members can read + insert; rows are immutable (no update/delete policies).
create policy "tenant members read audit" on public.audit_events
  for select using (tenant_id in (select app.user_tenant_ids()));
create policy "tenant members append audit" on public.audit_events
  for insert with check (tenant_id in (select app.user_tenant_ids()));
revoke update, delete on public.audit_events from anon, authenticated;
