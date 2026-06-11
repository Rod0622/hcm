"use client";

import * as React from "react";
import { Page } from "@/components/app-shell";
import { Icon, Card, Stat, Badge, Button, Banner, Avatar, Table, Select, SegmentedControl, Dialog } from "@/components/ui";
import { payroll as PR } from "@/lib/data";

const STEPS = ["Draft", "In review", "Approved", "Processed"];

function RunTimeline({ current }: { current: string }) {
  const idx = STEPS.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: i < idx ? "var(--success)" : i === idx ? "var(--accent)" : "var(--bg-inset)",
              border: i > idx ? "1px solid var(--border-2)" : "none",
              color: "#fff",
            }}>
              {i < idx ? <Icon name="check" size={11} color="#fff" /> : i === idx ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} /> : null}
            </span>
            <span style={{
              font: `var(--weight-${i === idx ? "semibold" : "regular"}) var(--text-xs)/1 var(--font-sans)`,
              color: i <= idx ? "var(--text-1)" : "var(--text-3)", whiteSpace: "nowrap",
            }}>{s}</span>
          </div>
          {i < STEPS.length - 1 ? <span style={{ flex: 1, height: 1, background: i < idx ? "var(--success)" : "var(--border-2)", margin: "0 10px", minWidth: 24 }} /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function PayrollAdmin() {
  const [confirm, setConfirm] = React.useState(false);
  const [view, setView] = React.useState("Exceptions");
  return (
    <Page
      eyebrow="Payroll"
      title="Payroll review"
      actions={
        <React.Fragment>
          <Select options={["US Semi-monthly · Jun 1–15", "US Semi-monthly · May 16–31", "PH Monthly · June"]} style={{ width: 240 }} />
          <Button variant="primary" size="sm" onClick={() => setConfirm(true)}>Submit payroll</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ font: "var(--title-section)", color: "var(--text-1)", flex: 1 }}>{PR.group} · {PR.period}</h1>
              <Badge tone="info" dot>{PR.status}</Badge>
              <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>Pay date {PR.payDate}</span>
            </div>
            <RunTimeline current="In review" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, borderTop: "1px solid var(--border-1)", paddingTop: 18 }}>
              <Stat label="Employees" value={String(PR.employees)} />
              <Stat label="Gross pay" value={PR.gross} />
              <Stat label="Taxes withheld" value={PR.taxes} />
              <Stat label="Employer contributions" value={PR.contributions} />
              <Stat label="Net pay" value={PR.net} delta="-1.8%" hint="vs last run" />
            </div>
          </div>
        </Card>

        <Banner
          tone="danger"
          title="2 blockers prevent submission"
          description="Resolve them below or remove the affected employees from this run."
        />

        <Card
          title={view === "Exceptions" ? "Exceptions" : "Pay register"}
          subtitle={view === "Exceptions" ? "4 found by the rules engine" : "118 employees in this run"}
          padding="0"
          actions={<SegmentedControl options={["Exceptions", "Register"]} value={view} onChange={setView} />}
        >
          {view === "Exceptions" ? (
            <Table
              rowKey="who"
              columns={[
                { key: "who", label: "Employee", render: (r) => <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={r.who} size={22} />{r.who}</span> },
                { key: "issue", label: "Issue" },
                { key: "severity", label: "Severity", render: (r) => <Badge tone={r.tone} dot>{r.severity}</Badge> },
                { key: "action", label: "", align: "right", render: (r) => <Button size="sm" variant="secondary">{r.action}</Button> },
              ]}
              rows={PR.exceptions}
            />
          ) : (
            <Table
              compact
              rowKey="name"
              onRowClick={() => {}}
              columns={[
                { key: "name", label: "Employee", render: (r) => <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={r.name} size={22} />{r.name}</span> },
                { key: "gross", label: "Gross", mono: true, align: "right" },
                { key: "taxes", label: "Taxes", mono: true, align: "right" },
                { key: "deductions", label: "Deductions", mono: true, align: "right" },
                { key: "net", label: "Net", mono: true, align: "right" },
                { key: "change", label: "Change", render: (r) => r.change === "—" ? <span style={{ color: "var(--text-3)" }}>—</span> : <Badge tone={r.tone || "neutral"}>{r.change}</Badge> },
              ]}
              rows={PR.lines}
            />
          )}
        </Card>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Submit payroll"
        description="Jun 1–15 · 118 employees · $1,284,302 net. Submission locks the register and notifies approvers."
        footer={
          <React.Fragment>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setConfirm(false)}>Submit for approval</Button>
          </React.Fragment>
        }
      >
        <Banner tone="danger" title="2 blockers will be carried" description="Blocked employees are excluded until resolved." />
      </Dialog>
    </Page>
  );
}
