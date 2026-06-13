"use client";

import * as React from "react";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Avatar, Table, EmptyState, type BadgeTone } from "@/components/ui";

export type PackRow = {
  id: string;
  country: string;
  entity: string;
  name: string;
  done: number;
  total: number;
  next: string;
};

export type TaskRow = {
  id: string;
  task: string;
  subject: string;
  due: string;
  overdue: boolean;
  severity: string;
  tone: BadgeTone;
  status: string;
};

export type AuditRow = { when: string; actor: string; action: string; source: string };

function PackCard({ p }: { p: PackRow }) {
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 100;
  const complete = p.done === p.total;
  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 30, height: 30, borderRadius: "var(--radius-sm)",
            background: "var(--bg-inset)", border: "1px solid var(--border-1)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-2)",
          }}><Icon name="landmark" size={15} /></span>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
            <span style={{ font: "var(--title-card)", color: "var(--text-1)" }}>{p.country}</span>
            <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{p.entity}</span>
          </div>
          <Badge tone={complete ? "success" : "warning"} dot>{complete ? "Compliant" : `${p.total - p.done} open`}</Badge>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)", color: "var(--text-3)" }}>
            <span>{p.done}/{p.total} requirements</span><span>{pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--bg-inset)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: complete ? "var(--success)" : "var(--accent)", borderRadius: 2 }} />
          </div>
        </div>
        <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>Next: {p.next}</span>
      </div>
    </Card>
  );
}

export function Compliance({ packs, tasks, audit }: { packs: PackRow[]; tasks: TaskRow[]; audit: AuditRow[] }) {
  const exportAudit = async () => {
    const { downloadCsv } = await import("@/lib/csv");
    downloadCsv(
      `compliance-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      ["When", "Actor", "Action", "Source"],
      audit.map((a) => [a.when, a.actor, a.action, a.source])
    );
  };

  return (
    <Page
      eyebrow="Operations"
      title="Compliance center"
      actions={<Button variant="secondary" size="sm" icon={<Icon name="download" size={14} />} onClick={exportAudit}>Audit report</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
          {packs.length === 0 ? (
            <Card><EmptyState icon={<Icon name="shield-check" size={18} />} title="No compliance packs" description="Country packs appear here once configured." /></Card>
          ) : packs.map((p) => <PackCard key={p.id} p={p} />)}
        </div>

        <Card title="Open tasks" subtitle="Outstanding requirements across all packs" padding="0">
          {tasks.length === 0 ? (
            <EmptyState icon={<Icon name="circle-check" size={18} />} title="Everything is current" description="No outstanding compliance requirements." />
          ) : (
            <Table
              rowKey="id"
              columns={[
                { key: "task", label: "Requirement" },
                { key: "subject", label: "Subject" },
                { key: "due", label: "Due", mono: true, render: (r) => (
                  <span style={{ color: r.overdue ? "var(--danger-text)" : "var(--text-1)" }}>{r.due}{r.overdue ? " · overdue" : ""}</span>
                )},
                { key: "severity", label: "Severity", render: (r) => <Badge tone={r.tone} dot>{r.severity}</Badge> },
              ]}
              rows={tasks}
            />
          )}
        </Card>

        <Card title="Audit log" subtitle="Immutable · actor, action, source" padding="0">
          {audit.length === 0 ? (
            <EmptyState icon={<Icon name="scroll-text" size={18} />} title="No events yet" description="System changes are recorded here." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {audit.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "11px 20px", borderBottom: i === audit.length - 1 ? "none" : "1px solid var(--border-1)" }}>
                  <span style={{ width: 90, flexShrink: 0, font: "var(--weight-medium) var(--text-2xs)/1.4 var(--font-mono)", color: "var(--text-3)" }}>{a.when}</span>
                  <span style={{ width: 90, flexShrink: 0, font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}><Avatar name={a.actor} size={18} />{a.actor}</span>
                  <span style={{ flex: 1, font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{a.action}</span>
                  <Badge tone="neutral">{a.source}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
