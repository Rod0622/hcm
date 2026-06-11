-- Tenkara HCM — 002 workflow engine
-- Event bus, versioned workflow definitions (graph as JSONB), runs, steps,
-- approvals, tasks, notifications. Definitions are immutable once published;
-- runs always pin a version.

-- ---------- Domain event bus ----------
-- Every lifecycle event (employee.hired, worker.promoted, salary.changed,
-- document.expiring, payroll.exception_detected, ...) lands here; the engine
-- fans out to matching workflow definitions.
create table public.domain_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  object_type text not null,
  object_id uuid,
  payload jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------- Definitions ----------
create table public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,                       -- 'onboarding_global'
  name text not null,
  description text,
  object_type text not null default 'worker',
  trigger_event text not null,             -- matches domain_events.event_type
  trigger_filter jsonb not null default '{}',  -- e.g. {"entity.country": "PH"}
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  current_version int not null default 1,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, key)
);

create table public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  version int not null,
  -- graph: { nodes: [{id, type: trigger|condition|approval|task|integration|delay|notify|document,
  --                   title, config}], edges: [{from, to, label?}] }
  graph jsonb not null default '{"nodes":[],"edges":[]}',
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (definition_id, version)
);

-- ---------- Runs ----------
create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  version_id uuid not null references public.workflow_versions(id),
  triggered_by_event bigint references public.domain_events(id),
  subject_type text not null default 'worker',
  subject_id uuid,                          -- e.g. workers.id
  status text not null default 'pending'
    check (status in ('pending','running','waiting','blocked','completed','failed','cancelled')),
  context jsonb not null default '{}',      -- evaluated variables, branch choices
  current_node text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text
);

create table public.workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  node_id text not null,                    -- id within graph.nodes
  node_type text not null,
  status text not null default 'pending'
    check (status in ('pending','running','waiting','succeeded','failed','skipped','cancelled')),
  attempt int not null default 1,
  max_attempts int not null default 3,      -- retries for integration/notify steps
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  started_at timestamptz,
  finished_at timestamptz,
  next_retry_at timestamptz,
  error text
);

-- ---------- Human work ----------
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_step_id uuid references public.workflow_run_steps(id) on delete set null,
  subject text not null,                    -- 'Salary change · +6% effective Jul 1'
  kind text not null default 'general'
    check (kind in ('general','leave','compensation','equipment','document','payroll','policy')),
  requested_for_worker_id uuid references public.workers(id) on delete set null,
  assignee_user_id uuid references auth.users(id),
  assignee_rule text,                       -- 'hiring_manager','department_head','people_team'
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','delegated','expired','cancelled')),
  due_at timestamptz,
  escalate_after interval,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_step_id uuid references public.workflow_run_steps(id) on delete set null,
  title text not null,
  description text,
  kind text not null default 'general'
    check (kind in ('general','onboarding','offboarding','document','compliance','it','payroll')),
  status text not null default 'open'
    check (status in ('open','in_progress','done','blocked','cancelled')),
  worker_id uuid references public.workers(id) on delete set null,
  owner_user_id uuid references auth.users(id),
  due_on date,
  evidence jsonb not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_step_id uuid references public.workflow_run_steps(id) on delete set null,
  recipient_user_id uuid references auth.users(id),
  channel text not null default 'in_app' check (channel in ('in_app','email','slack','webhook')),
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued','sent','failed','read')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index on public.domain_events (tenant_id, occurred_at desc);
create index on public.domain_events (tenant_id, event_type) where processed_at is null;
create index on public.workflow_definitions (tenant_id, status);
create index on public.workflow_definitions (tenant_id, trigger_event) where status = 'active';
create index on public.workflow_versions (definition_id);
create index on public.workflow_runs (tenant_id, status);
create index on public.workflow_runs (definition_id, started_at desc);
create index on public.workflow_runs (subject_type, subject_id);
create index on public.workflow_run_steps (run_id);
create index on public.workflow_run_steps (tenant_id, status, next_retry_at);
create index on public.approvals (tenant_id, status, assignee_user_id);
create index on public.tasks (tenant_id, status, owner_user_id);
create index on public.tasks (tenant_id, worker_id);
create index on public.notifications (tenant_id, recipient_user_id, status);

-- ---------- Audit ----------
create trigger audit_workflow_definitions after insert or update or delete on public.workflow_definitions
  for each row execute function app.log_audit();
create trigger audit_approvals after insert or update or delete on public.approvals
  for each row execute function app.log_audit();

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array[
    'domain_events','workflow_definitions','workflow_versions','workflow_runs',
    'workflow_run_steps','approvals','tasks','notifications'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "tenant members all" on public.%I for all
         using (tenant_id in (select app.user_tenant_ids()))
         with check (tenant_id in (select app.user_tenant_ids()))', t);
  end loop;
end $$;
