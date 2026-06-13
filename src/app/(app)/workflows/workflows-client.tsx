"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Badge, Button, Input, Select, Switch, Card, Table, SegmentedControl, EmptyState, type BadgeTone } from "@/components/ui";

export type RunRow = {
  id: string;
  workflow: string;
  subject: string;
  status: string;
  step: string;
  started: string;
};

export type DefinitionRow = {
  id: string;
  name: string;
  trigger: string;
  status: string;
  versions: number;
  runs: number;
};

const RUN_TONE: Record<string, BadgeTone> = {
  running: "info", blocked: "danger", waiting: "warning", completed: "success", cancelled: "neutral", failed: "danger",
};
const DEF_TONE: Record<string, BadgeTone> = {
  active: "success", draft: "neutral", paused: "warning", archived: "neutral",
};

const NODE_TYPES: Record<string, { icon: string; color: string; label: string }> = {
  trigger:     { icon: "zap", color: "var(--chart-1)", label: "Trigger" },
  condition:   { icon: "split", color: "var(--chart-3)", label: "Condition" },
  approval:    { icon: "user-check", color: "var(--chart-4)", label: "Approval" },
  task:        { icon: "list-checks", color: "var(--chart-2)", label: "Task" },
  integration: { icon: "plug", color: "var(--chart-5)", label: "Integration" },
  delay:       { icon: "timer", color: "var(--gray-400)", label: "Delay" },
  notify:      { icon: "bell", color: "var(--chart-2)", label: "Notification" },
};

type NodeDef = { id: string; type: keyof typeof NODE_TYPES; title: string; sub: string; x: number; y: number };

const NODES: NodeDef[] = [
  { id: "n1", type: "trigger", title: "Employee hired", sub: "Object: Worker · any entity", x: 40, y: 150 },
  { id: "n2", type: "condition", title: "Country?", sub: "worker.entity.country", x: 270, y: 150 },
  { id: "n3", type: "approval", title: "Manager approval", sub: "Assignee: hiring manager", x: 500, y: 60 },
  { id: "n4", type: "task", title: "Collect PH documents", sub: "TIN, SSS, PhilHealth", x: 500, y: 240 },
  { id: "n5", type: "integration", title: "Provision Google Workspace", sub: "Group: all@trytenkara.com", x: 730, y: 60 },
  { id: "n6", type: "notify", title: "Welcome message", sub: "Slack #people-ops", x: 960, y: 150 },
];

const EDGES: Array<[string, string, string?]> = [
  ["n1", "n2"], ["n2", "n3", "US"], ["n2", "n4", "PH"], ["n3", "n5"], ["n5", "n6"], ["n4", "n6"],
];

const NODE_W = 196, NODE_H = 64;

function center(n: NodeDef, side: "in" | "out") {
  return { x: n.x + (side === "out" ? NODE_W : 0), y: n.y + NODE_H / 2 };
}

function Node({ n, selected, onSelect }: { n: NodeDef; selected: boolean; onSelect: (id: string) => void }) {
  const t = NODE_TYPES[n.type];
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}
      style={{
        position: "absolute", left: n.x, top: n.y, width: NODE_W, height: NODE_H,
        background: "var(--bg-raised)",
        border: `1px solid ${selected ? "var(--border-focus)" : "var(--border-1)"}`,
        boxShadow: selected ? "var(--shadow-focus)" : "var(--shadow-sm)",
        borderRadius: "var(--radius-md)",
        display: "flex", alignItems: "center", gap: 10, padding: "0 12px",
        cursor: "pointer",
        transition: "border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: "var(--radius-sm)", flexShrink: 0,
        background: `color-mix(in srgb, ${t.color} 14%, transparent)`,
        color: t.color, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={t.icon} size={15} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</span>
        <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</span>
      </div>
    </div>
  );
}

function Inspector({ node }: { node: NodeDef | undefined }) {
  if (!node) return (
    <p style={{ font: "var(--body-sm)", color: "var(--text-3)", padding: "var(--space-4)" }}>Select a step to configure it.</p>
  );
  const t = NODE_TYPES[node.type];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: t.color, display: "inline-flex" }}><Icon name={t.icon} size={16} /></span>
        <span style={{ font: "var(--title-card)", color: "var(--text-1)", flex: 1 }}>{t.label}</span>
        <Badge tone="neutral" mono>{node.id}</Badge>
      </div>
      <Input label="Step name" defaultValue={node.title} />
      {node.type === "approval" ? (
        <React.Fragment>
          <Select label="Assignee" options={["Hiring manager", "Department head", "People team", "Custom…"]} />
          <Select label="Escalate after" options={["24 hours", "48 hours", "3 business days"]} />
          <Switch label="Allow delegation" defaultChecked />
        </React.Fragment>
      ) : node.type === "condition" ? (
        <React.Fragment>
          <Select label="Field" options={["worker.entity.country", "worker.type", "worker.department"]} />
          <Input label="Branches" defaultValue="US · PH · default" hint="One branch per value" />
        </React.Fragment>
      ) : node.type === "integration" ? (
        <React.Fragment>
          <Select label="Connector" options={["Google Workspace", "Slack", "Microsoft 365", "GitHub"]} />
          <Select label="Action" options={["Create account", "Add to group", "Send message"]} />
          <Switch label="Retry on failure" defaultChecked />
        </React.Fragment>
      ) : (
        <Input label="Description" defaultValue={node.sub} />
      )}
      <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <Switch label="Audit this step" defaultChecked />
        <Button variant="ghost" size="sm" icon={<Icon name="trash-2" size={14} />} style={{ alignSelf: "flex-start", color: "var(--danger-text)" }}>Remove step</Button>
      </div>
    </div>
  );
}

function BuilderCanvas() {
  const [selected, setSelected] = React.useState<string | null>("n3");
  const sel = NODES.find((n) => n.id === selected);
  return (
      <div style={{ display: "grid", gridTemplateColumns: "168px 1fr 260px", gap: "var(--space-4)", height: "calc(100vh - 190px)", minHeight: 420 }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-1)", borderRadius: "var(--radius-lg)", padding: 10, display: "flex", flexDirection: "column", gap: 2, alignSelf: "start" }}>
          <span style={{ font: "var(--label-caps)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-3)", padding: "4px 6px 8px" }}>Steps</span>
          {Object.entries(NODE_TYPES).map(([k, t]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: "var(--radius-sm)", cursor: "grab", color: "var(--text-2)", font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)" }}>
              <span style={{ color: t.color, display: "inline-flex" }}><Icon name={t.icon} size={14} /></span>
              {t.label}
              <span style={{ flex: 1 }} />
              <Icon name="grip-vertical" size={12} color="var(--text-3)" />
            </div>
          ))}
        </div>

        <div
          onClick={() => setSelected(null)}
          style={{
            position: "relative", overflow: "auto",
            background: "var(--bg-sunken)",
            backgroundImage: "radial-gradient(var(--border-2) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            border: "1px solid var(--border-1)", borderRadius: "var(--radius-lg)",
          }}
        >
          <div style={{ position: "relative", width: 1200, height: 420 }}>
            <svg width="1200" height="420" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {EDGES.map(([a, b, label], i) => {
                const na = NODES.find((n) => n.id === a)!, nb = NODES.find((n) => n.id === b)!;
                const p1 = center(na, "out"), p2 = center(nb, "in");
                const mx = (p1.x + p2.x) / 2;
                return (
                  <g key={i}>
                    <path d={`M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`} fill="none" stroke="var(--border-2)" strokeWidth="1.5" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="var(--border-2)" />
                    {label ? (
                      <g>
                        <rect x={mx - 16} y={(p1.y + p2.y) / 2 - 10} width="32" height="18" rx="9" fill="var(--bg-raised)" stroke="var(--border-1)" />
                        <text x={mx} y={(p1.y + p2.y) / 2 + 3} textAnchor="middle" style={{ font: "600 9px var(--font-mono)", fill: "var(--text-2)" }}>{label}</text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </svg>
            {NODES.map((n) => <Node key={n.id} n={n} selected={selected === n.id} onSelect={setSelected} />)}
          </div>
        </div>

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-1)", borderRadius: "var(--radius-lg)", alignSelf: "start", width: "100%" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)", font: "var(--label-caps)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>Inspector</div>
          <Inspector node={sel} />
        </div>
      </div>
  );
}

export function Workflows({ runs, definitions }: { runs: RunRow[]; definitions: DefinitionRow[] }) {
  const router = useRouter();
  const [view, setView] = React.useState("runs");

  return (
    <Page
      eyebrow="Platform"
      title="Workflows"
      actions={
        <SegmentedControl
          options={[{ value: "runs", label: "Runs" }, { value: "builder", label: "Builder" }]}
          value={view}
          onChange={setView}
        />
      }
      maxWidth={view === "builder" ? "100%" : undefined}
    >
      {view === "builder" ? (
        <BuilderCanvas />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Card title="Active runs" subtitle="In-flight workflow executions" padding="0">
            {runs.length === 0 ? (
              <EmptyState icon={<Icon name="workflow" size={18} />} title="No active runs" description="Runs appear here as workflows trigger." />
            ) : (
              <Table
                rowKey="id"
                onRowClick={(r) => router.push(`/workflows/${r.id}`)}
                columns={[
                  { key: "workflow", label: "Workflow" },
                  { key: "subject", label: "Subject" },
                  { key: "step", label: "Current step", mono: true },
                  { key: "started", label: "Started", mono: true },
                  { key: "status", label: "Status", render: (r) => <Badge tone={RUN_TONE[r.status] ?? "neutral"} dot>{r.status}</Badge> },
                ]}
                rows={runs}
              />
            )}
          </Card>

          <Card title="Workflow definitions" subtitle="Published automations · open the Builder to edit" padding="0">
            {definitions.length === 0 ? (
              <EmptyState icon={<Icon name="workflow" size={18} />} title="No definitions" description="Build an automation in the Builder tab." />
            ) : (
              <Table
                rowKey="id"
                columns={[
                  { key: "name", label: "Workflow" },
                  { key: "trigger", label: "Trigger", mono: true },
                  { key: "versions", label: "Versions", mono: true, align: "right" },
                  { key: "runs", label: "Runs", mono: true, align: "right" },
                  { key: "status", label: "Status", render: (r) => <Badge tone={DEF_TONE[r.status] ?? "neutral"} dot>{r.status}</Badge> },
                ]}
                rows={definitions}
              />
            )}
          </Card>
        </div>
      )}
    </Page>
  );
}
