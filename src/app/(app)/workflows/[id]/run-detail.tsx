"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, type BadgeTone } from "@/components/ui";

export type StepRow = {
  id: string;
  type: string;
  status: string;
  label: string;
  work: string;
};

const NODE_ICON: Record<string, string> = {
  trigger: "zap", document: "file-text", task: "list-checks", approval: "user-check",
  integration: "plug", notify: "bell", condition: "split", delay: "timer",
};
const STEP_TONE: Record<string, BadgeTone> = {
  succeeded: "success", waiting: "warning", pending: "neutral", running: "info", failed: "danger", skipped: "neutral", cancelled: "neutral",
};
const RUN_TONE: Record<string, BadgeTone> = {
  running: "info", waiting: "warning", blocked: "danger", completed: "success", cancelled: "neutral", failed: "danger", pending: "neutral",
};

export function RunDetail({ workflow, subject, status, started, finished, steps }: {
  workflow: string;
  subject: string;
  status: string;
  started: string;
  finished: string | null;
  steps: StepRow[];
}) {
  const router = useRouter();
  const done = steps.filter((s) => s.status === "succeeded").length;

  return (
    <Page
      eyebrow="Workflows"
      title={workflow}
      actions={<Button variant="secondary" size="sm" icon={<Icon name="arrow-left" size={14} />} onClick={() => router.push("/workflows")}>All runs</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ font: "var(--title-page)", color: "var(--text-1)" }}>{workflow}</h1>
          <Badge tone={RUN_TONE[status] ?? "neutral"} dot>{status}</Badge>
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
            {subject} · started {started}{finished ? ` · finished ${finished}` : ""} · {done}/{steps.length} steps done
          </span>
        </div>

        <Card title="Steps" subtitle="Materialized from the workflow graph" padding="0">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {steps.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i === steps.length - 1 ? "none" : "1px solid var(--border-1)" }}>
                <span style={{
                  width: 28, height: 28, borderRadius: "var(--radius-sm)", flexShrink: 0,
                  background: "var(--bg-inset)", border: "1px solid var(--border-1)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-2)",
                }}>
                  <Icon name={NODE_ICON[s.type] ?? "circle"} size={14} />
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
                  <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{s.label}</span>
                  <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{s.type} · {s.work}</span>
                </div>
                <Badge tone={STEP_TONE[s.status] ?? "neutral"} dot>{s.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}
