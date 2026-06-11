"use client";

import * as React from "react";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Avatar, Table } from "@/components/ui";
import { compliance as C } from "@/lib/data";

function PackCard({ p }: { p: (typeof C.packs)[number] }) {
  const pct = Math.round((p.done / p.total) * 100);
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

export default function Compliance() {
  return (
    <Page
      eyebrow="Operations"
      title="Compliance center"
      actions={
        <React.Fragment>
          <Button variant="secondary" size="sm" icon={<Icon name="download" size={14} />}>Audit report</Button>
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />}>Add country pack</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
          {C.packs.map((p) => <PackCard key={p.country} p={p} />)}
        </div>

        <Card title="Tasks" subtitle="Generated from country packs and policies" padding="0">
          <Table
            rowKey="task"
            onRowClick={() => {}}
            columns={[
              { key: "task", label: "Task" },
              { key: "country", label: "Pack", render: (r) => <Badge tone="neutral" mono>{r.country}</Badge> },
              { key: "due", label: "Due", mono: true },
              { key: "severity", label: "Severity", render: (r) => <Badge tone={r.tone} dot>{r.severity}</Badge> },
              { key: "owner", label: "Owner", render: (r) => <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={r.owner} size={20} />{r.owner}</span> },
            ]}
            rows={C.tasks}
          />
        </Card>

        <Card title="Audit log" subtitle="Immutable · actor, source, old → new" padding="0" actions={<Button size="sm" variant="ghost">View all</Button>}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {C.audit.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "11px 20px", borderBottom: i === C.audit.length - 1 ? "none" : "1px solid var(--border-1)" }}>
                <span style={{ width: 110, flexShrink: 0, font: "var(--weight-medium) var(--text-2xs)/1.4 var(--font-mono)", color: "var(--text-3)" }}>{a.when}</span>
                <span style={{ width: 90, flexShrink: 0, font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>{a.actor}</span>
                <span style={{ flex: 1, font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{a.action}</span>
                <Badge tone="neutral">{a.source}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}
