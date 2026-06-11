-- Tenkara HCM — 009 role-based access (admin vs employee)
-- Two effective tiers: privileged roles (owner/admin/hr/finance) keep full
-- tenant access; regular members (manager/member) see the directory and org
-- data, but only THEIR OWN compensation, payslips, documents, leave, and
-- notifications. Recruiting, payroll administration, compliance, workflows,
-- and config become admin-only. Enforced here in RLS — the UI gating in the
-- app is convenience, this is the security boundary.

-- ---------- Helpers ----------
create function app.is_admin(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from tenant_users
    where tenant_id = t and user_id = auth.uid()
      and role in ('owner','admin','hr','finance')
  )
$$;

create function app.my_worker_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$ select id from workers where user_id = auth.uid() $$;

-- ---------- Re-scope existing blanket policies ----------
do $$
declare t text;
begin
  -- Everything that had the blanket "tenant members all" policy.
  foreach t in array array[
    'legal_entities','locations','org_units','positions','people','workers',
    'compensation_records','object_definitions','field_definitions','field_values','documents',
    'workflow_definitions','workflow_versions','workflow_runs','workflow_run_steps',
    'approvals','tasks','notifications','domain_events',
    'pay_groups','pay_periods','pay_codes','payroll_rule_sets','payroll_rule_versions',
    'payroll_runs','payroll_run_lines','payroll_line_items','payroll_exceptions',
    'compliance_packs','compliance_requirements','compliance_statuses','policy_acknowledgments',
    'integration_accounts','sync_jobs',
    'job_openings','candidates','applications','offers','outbound_emails',
    'software_apps','access_grants','rejection_batches',
    'leave_policies','leave_requests'
  ] loop
    execute format('drop policy if exists "tenant members all" on public.%I', t);
    -- Privileged roles keep full access everywhere.
    execute format(
      'create policy "admins all" on public.%I for all
         using (app.is_admin(tenant_id))
         with check (app.is_admin(tenant_id))', t);
  end loop;

  -- Directory & org structure stay readable by every member.
  foreach t in array array[
    'legal_entities','locations','org_units','positions','people','workers','leave_policies'
  ] loop
    execute format(
      'create policy "members read" on public.%I for select
         using (tenant_id in (select app.user_tenant_ids()))', t);
  end loop;
end $$;

-- ---------- Own-record visibility for members ----------
create policy "own compensation" on public.compensation_records for select
  using (worker_id in (select app.my_worker_ids()));

create policy "own documents" on public.documents for select
  using (worker_id in (select app.my_worker_ids()));

create policy "own payslip lines" on public.payroll_run_lines for select
  using (worker_id in (select app.my_worker_ids()));

-- Leave: employees manage their own requests; approvers see and decide
-- requests routed to them.
create policy "own leave select" on public.leave_requests for select
  using (worker_id in (select app.my_worker_ids())
         or approver_worker_id in (select app.my_worker_ids()));
create policy "own leave insert" on public.leave_requests for insert
  with check (tenant_id in (select app.user_tenant_ids())
              and worker_id in (select app.my_worker_ids()));
create policy "own leave update" on public.leave_requests for update
  using (worker_id in (select app.my_worker_ids())
         or approver_worker_id in (select app.my_worker_ids()));

-- Approvals/tasks: assignees see and act on their own items.
create policy "assigned approvals select" on public.approvals for select
  using (assignee_user_id = auth.uid());
create policy "assigned approvals update" on public.approvals for update
  using (assignee_user_id = auth.uid());
create policy "assigned tasks select" on public.tasks for select
  using (owner_user_id = auth.uid());
create policy "assigned tasks update" on public.tasks for update
  using (owner_user_id = auth.uid());

-- Notifications are personal: recipient-only read/ack (triggers that fan
-- them out are security definer and bypass this).
create policy "own notifications select" on public.notifications for select
  using (recipient_user_id = auth.uid());
create policy "own notifications update" on public.notifications for update
  using (recipient_user_id = auth.uid());

-- Policy acknowledgments: members read and sign their own.
create policy "own acknowledgments select" on public.policy_acknowledgments for select
  using (worker_id in (select app.my_worker_ids()));
create policy "own acknowledgments insert" on public.policy_acknowledgments for insert
  with check (tenant_id in (select app.user_tenant_ids())
              and worker_id in (select app.my_worker_ids()));

-- Audit log may reference anyone's data: reading becomes admin-only.
drop policy if exists "tenant members read audit" on public.audit_events;
create policy "admins read audit" on public.audit_events for select
  using (app.is_admin(tenant_id));

-- ---------- My payslips (member payroll view) ----------
-- Security-definer view pinned to auth.uid(): exposes only the caller's own
-- lines with period context, without opening payroll_runs (totals) to members.
create view public.my_payslips as
select
  l.id,
  l.tenant_id,
  w.user_id,
  pg.name as pay_group,
  pp.period_start,
  pp.period_end,
  pp.pay_date,
  r.status as run_status,
  l.currency,
  l.gross,
  l.taxes,
  l.deductions,
  l.net
from public.payroll_run_lines l
join public.workers w on w.id = l.worker_id
join public.payroll_runs r on r.id = l.run_id
join public.pay_periods pp on pp.id = r.pay_period_id
join public.pay_groups pg on pg.id = r.pay_group_id
where w.user_id = auth.uid();

grant select on public.my_payslips to authenticated;

-- ---------- Resume storage becomes admin-only ----------
drop policy if exists "tenant members read resumes" on storage.objects;
drop policy if exists "tenant members upload resumes" on storage.objects;
drop policy if exists "tenant members delete resumes" on storage.objects;

create policy "admins read resumes" on storage.objects for select
  using (bucket_id = 'resumes' and app.is_admin((storage.foldername(name))[1]::uuid));
create policy "admins upload resumes" on storage.objects for insert
  with check (bucket_id = 'resumes' and app.is_admin((storage.foldername(name))[1]::uuid));
create policy "admins delete resumes" on storage.objects for delete
  using (bucket_id = 'resumes' and app.is_admin((storage.foldername(name))[1]::uuid));
