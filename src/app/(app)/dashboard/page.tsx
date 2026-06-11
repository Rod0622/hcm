"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Stat, Badge, Button, Banner, Avatar, Table, IconButton, SegmentedControl } from "@/components/ui";
import { approvals, employees, user, workflowRuns } from "@/lib/data";

const HEADCOUNT = [
  { m: "Jan", v: 112 }, { m: "Feb", v: 118 }, { m: "Mar", v: 121 },
  { m: "Apr", v: 127 }, { m: "May", v: 136 }, { m: "Jun", v: 142 },
];

function HeadcountChart() {
  const max = 150;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 130, paddingTop: 8 }}>
      {HEADCOUNT.map((d, i) => (
        <div key={d.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
          <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)", color: i === HEADCOUNT.length - 1 ? "var(--text-1)" : "var(--text-3)" }}>{d.v}</span>
          <div style={{
            width: "100%", maxWidth: 44, height: `${(d.v / max) * 100}%`,
            background: i === HEADCOUNT.length - 1 ? "var(--chart-1)" : "var(--accent-subtle)",
            border: i === HEADCOUNT.length - 1 ? "none" : "1px solid var(--accent-muted)",
            borderRadius: "4px 4px 2px 2px",
          }} />
          <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-sans)", color: "var(--text-3)" }}>{d.m}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const go = (path: string) => router.push(path);
  return (
    <Page
      title="Home"
      actions={
        <React.Fragment>
          <SegmentedControl options={["My view", "Company"]} defaultValue="Company" />
          <Button variant="secondary" size="sm" icon={<Icon name="plus" size={14} />}>Add employee</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div>
          <h1 style={{ font: "var(--title-page)", color: "var(--text-1)" }}>Good morning, {user.name.split(" ")[0]}</h1>
          <p style={{ font: "var(--body-sm)", color: "var(--text-3)", marginTop: 4 }}>Thursday, June 11 · Next payroll in 3 days · 2 workflows need attention</p>
        </div>

        <Banner
          tone="warning"
          title="2 payroll blockers"
          description="Missing tax IDs prevent the Jun 1–15 run from processing."
          action={<Button size="sm" variant="secondary" onClick={() => go("/payroll")}>Review run</Button>}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)" }}>
          <Card><Stat label="Headcount" value="142" delta="+6" hint="this month" /></Card>
          <Card><Stat label="Net pay · Jun 1–15" value="$1.28M" deltaTone="neutral" hint="118 employees" /></Card>
          <Card><Stat label="Open roles" value="9" deltaTone="neutral" hint="4 in offer stage" /></Card>
          <Card><Stat label="Compliance tasks" value="3" delta="1 blocker" deltaTone="danger" hint="due this month" /></Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--space-4)" }}>
          <Card title="Headcount movements" subtitle="Trailing 6 months" actions={<IconButton label="Open analytics" onClick={() => go("/analytics")}><Icon name="arrow-up-right" size={15} /></IconButton>}>
            <HeadcountChart />
          </Card>
          <Card title="Pending approvals" subtitle="Assigned to you" padding="0">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {approvals.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 20px",
                  borderBottom: i === approvals.length - 1 ? "none" : "1px solid var(--border-1)",
                }}>
                  <Avatar name={a.who} size={26} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{a.who}</span>
                    <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.what}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Button size="sm" variant="secondary">Approve</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <Card title="Workflow runs" subtitle="Live" padding="0" actions={<Button size="sm" variant="ghost" onClick={() => go("/workflows")}>Open builder</Button>}>
            <Table
              compact
              rowKey="name"
              onRowClick={() => go("/workflows")}
              columns={[
                { key: "name", label: "Workflow" },
                { key: "target", label: "Employee" },
                { key: "step", label: "Step", mono: true },
                { key: "status", label: "Status", render: (r) => <Badge tone={r.tone} dot>{r.status}</Badge> },
              ]}
              rows={workflowRuns}
            />
          </Card>
          <Card title="Starting soon" subtitle="Onboarding pipeline" padding="0" actions={<Button size="sm" variant="ghost" onClick={() => go("/employees")}>Directory</Button>}>
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
              rows={employees.slice(0, 3)}
            />
          </Card>
        </div>
      </div>
    </Page>
  );
}
