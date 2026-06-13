"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Stat, Badge, Button, Banner, Avatar, Table, IconButton, EmptyState, type BadgeTone } from "@/components/ui";
import { TimeClock, type ClockEntry } from "@/components/time-clock";
import { createClient } from "@/lib/supabase/client";

export type AdminData = {
  headcount: number;
  headcountDelta?: string;
  netPay: string | null;
  payEmployees: number | null;
  nextPayDate: string | null;
  openRoles: number;
  offerStage: number;
  complianceDue: number;
  complianceBlockers: number;
  payrollBlockers: number;
  headcountSeries: Array<{ m: string; v: number }>;
  approvals: Array<{ id: string; source: "leave" | "approval"; who: string; what: string }>;
  workflowRuns: Array<{ id: string; name: string; target: string; step: string; status: string; tone: BadgeTone }>;
  startingSoon: Array<{ id: string; name: string; dept: string; start: string; status: string; tone: BadgeTone }>;
};

function HeadcountChart({ series }: { series: Array<{ m: string; v: number }> }) {
  const max = Math.max(...series.map((d) => d.v), 1) * 1.15;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 130, paddingTop: 8 }}>
      {series.map((d, i) => (
        <div key={d.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
          <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)", color: i === series.length - 1 ? "var(--text-1)" : "var(--text-3)" }}>{d.v}</span>
          <div style={{
            width: "100%", maxWidth: 44, height: `${Math.max((d.v / max) * 100, 3)}%`,
            background: i === series.length - 1 ? "var(--chart-1)" : "var(--accent-subtle)",
            border: i === series.length - 1 ? "none" : "1px solid var(--accent-muted)",
            borderRadius: "4px 4px 2px 2px",
          }} />
          <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-sans)", color: "var(--text-3)" }}>{d.m}</span>
        </div>
      ))}
    </div>
  );
}

function QuickLink({ icon, label, description, href }: { icon: string; label: string; description: string; href: string }) {
  const router = useRouter();
  return (
    <Card>
      <button
        type="button"
        onClick={() => router.push(href)}
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
      >
        <span style={{
          width: 36, height: 36, borderRadius: "var(--radius-md)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--accent-subtle)", color: "var(--text-accent)",
        }}>
          <Icon name={icon} size={17} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{label}</span>
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>{description}</span>
        </span>
        <Icon name="arrow-up-right" size={15} color="var(--text-3)" />
      </button>
    </Card>
  );
}

function ApprovalsCard({ items }: { items: AdminData["approvals"] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const approve = async (item: AdminData["approvals"][number]) => {
    setBusy(item.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (item.source === "leave") {
      await supabase.from("leave_requests").update({
        status: "approved",
        decided_by: user?.id ?? null,
        decided_at: new Date().toISOString(),
      }).eq("id", item.id);
    } else {
      await supabase.from("approvals").update({ status: "approved" }).eq("id", item.id);
    }
    setBusy(null);
    router.refresh();
  };

  return (
    <Card title="Pending approvals" subtitle="Leave and general approvals" padding="0">
      {items.length === 0 ? (
        <EmptyState icon={<Icon name="circle-check" size={18} />} title="All clear" description="Nothing waiting on a decision." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((a, i) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 20px",
              borderBottom: i === items.length - 1 ? "none" : "1px solid var(--border-1)",
            }}>
              <Avatar name={a.who} size={26} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{a.who}</span>
                <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.what}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <Button size="sm" variant="secondary" disabled={busy === a.id} onClick={() => approve(a)}>
                  {busy === a.id ? "…" : "Approve"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export type TaskItem = { id: string; title: string; kind: string; due: string; forWhom: string };

function MyTasks({ tasks }: { tasks: TaskItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const complete = async (id: string) => {
    setBusy(id);
    const supabase = createClient();
    await supabase.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    setBusy(null);
    router.refresh();
  };

  return (
    <Card title="My tasks" subtitle="Assigned to you · onboarding and workflow steps" padding="0">
      <div style={{ display: "flex", flexDirection: "column" }}>
        {tasks.map((t, i) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: i === tasks.length - 1 ? "none" : "1px solid var(--border-1)" }}>
            <Icon name="list-checks" size={15} color="var(--text-3)" />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{t.title}</span>
              <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{t.forWhom ? `${t.forWhom} · ` : ""}{t.kind} · due {t.due}</span>
            </div>
            <Button size="sm" variant="secondary" disabled={busy === t.id} onClick={() => complete(t.id)}>
              {busy === t.id ? "…" : "Mark done"}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DashboardClient({ displayName, isAdmin, me, clockEntries, admin, tasks }: {
  displayName: string;
  isAdmin: boolean;
  me: { workerId: string; tenantId: string } | null;
  clockEntries: ClockEntry[];
  admin: AdminData | null;
  tasks: TaskItem[];
}) {
  const router = useRouter();
  const go = (path: string) => router.push(path);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <Page
      title="Home"
      actions={isAdmin ? (
        <Button variant="secondary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => go("/employees")}>
          Add employee
        </Button>
      ) : null}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div>
          <h1 style={{ font: "var(--title-page)", color: "var(--text-1)" }}>{greeting}, {displayName.split(" ")[0]}</h1>
          <p style={{ font: "var(--body-sm)", color: "var(--text-3)", marginTop: 4 }}>
            {dateLabel}{admin?.nextPayDate ? ` · Next pay date ${admin.nextPayDate}` : ""}
          </p>
        </div>

        {me ? <TimeClock workerId={me.workerId} tenantId={me.tenantId} entries={clockEntries} /> : null}

        {tasks.length > 0 ? <MyTasks tasks={tasks} /> : null}

        {!isAdmin || !admin ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
            <QuickLink icon="banknote" label="My payroll" description="Payslips and net pay" href="/payroll" />
            <QuickLink icon="clock" label="Time & leave" description="PTO balance and requests" href="/time" />
            <QuickLink icon="git-fork" label="Org chart" description="Who reports to whom" href="/orgchart" />
          </div>
        ) : (
          <React.Fragment>
            {admin.payrollBlockers > 0 ? (
              <Banner
                tone="warning"
                title={`${admin.payrollBlockers} payroll blocker${admin.payrollBlockers === 1 ? "" : "s"}`}
                description="Exceptions are preventing the current run from processing."
                action={<Button size="sm" variant="secondary" onClick={() => go("/payroll")}>Review run</Button>}
              />
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)" }}>
              <Card><Stat label="Headcount" value={String(admin.headcount)} delta={admin.headcountDelta} hint="active + onboarding" /></Card>
              <Card><Stat label="Latest run · net pay" value={admin.netPay ?? "—"} deltaTone="neutral" hint={admin.payEmployees != null ? `${admin.payEmployees} employees` : ""} /></Card>
              <Card><Stat label="Open roles" value={String(admin.openRoles)} deltaTone="neutral" hint={`${admin.offerStage} in offer stage`} /></Card>
              <Card><Stat label="Compliance tasks" value={String(admin.complianceDue)} delta={admin.complianceBlockers > 0 ? `${admin.complianceBlockers} blocker${admin.complianceBlockers === 1 ? "" : "s"}` : undefined} deltaTone="danger" hint="open items" /></Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--space-4)" }}>
              <Card title="Headcount" subtitle="Trailing 6 months · from hire dates" actions={<IconButton label="Open analytics" onClick={() => go("/analytics")}><Icon name="arrow-up-right" size={15} /></IconButton>}>
                <HeadcountChart series={admin.headcountSeries} />
              </Card>
              <ApprovalsCard items={admin.approvals} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Card title="Workflow runs" subtitle="Latest" padding="0" actions={<Button size="sm" variant="ghost" onClick={() => go("/workflows")}>Open builder</Button>}>
                {admin.workflowRuns.length === 0 ? (
                  <EmptyState icon={<Icon name="workflow" size={18} />} title="No runs yet" description="Workflow runs appear here as they start." />
                ) : (
                  <Table
                    compact
                    rowKey="id"
                    onRowClick={() => go("/workflows")}
                    columns={[
                      { key: "name", label: "Workflow" },
                      { key: "target", label: "Employee" },
                      { key: "step", label: "Step", mono: true },
                      { key: "status", label: "Status", render: (r) => <Badge tone={r.tone} dot>{r.status}</Badge> },
                    ]}
                    rows={admin.workflowRuns}
                  />
                )}
              </Card>
              <Card title="Starting soon" subtitle="Onboarding pipeline" padding="0" actions={<Button size="sm" variant="ghost" onClick={() => go("/employees")}>Directory</Button>}>
                {admin.startingSoon.length === 0 ? (
                  <EmptyState icon={<Icon name="users" size={18} />} title="No upcoming starts" description="New hires in onboarding appear here." />
                ) : (
                  <Table
                    compact
                    rowKey="id"
                    onRowClick={(r) => go(`/employees/${r.id}`)}
                    columns={[
                      { key: "name", label: "Employee", render: (r) => <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={r.name} size={22} />{r.name}</span> },
                      { key: "dept", label: "Department" },
                      { key: "start", label: "Start", mono: true },
                      { key: "status", label: "Status", render: (r) => <Badge tone={r.tone} dot>{r.status}</Badge> },
                    ]}
                    rows={admin.startingSoon}
                  />
                )}
              </Card>
            </div>
          </React.Fragment>
        )}
      </div>
    </Page>
  );
}
