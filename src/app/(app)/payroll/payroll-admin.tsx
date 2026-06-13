"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Stat, Badge, Button, Banner, Table, EmptyState, Dialog, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";

export type PeriodRow = {
  id: string;
  group: string;
  currency: string;
  label: string;
  payDate: string;
  periodStatus: string;
  run: { id: string; status: string } | null;
};

export type RunDetail = {
  id: string;
  status: string;
  group: string;
  currency: string;
  periodLabel: string;
  payDate: string;
  totals: { gross: number; taxes: number; deductions: number; net: number; employees: number };
  lines: Array<{
    id: string;
    name: string;
    gross: number;
    taxes: number;
    deductions: number;
    net: number;
    change: string;
    items: Array<{ name: string; kind: "earning" | "deduction" | "tax"; amount: number; quantity: number | null; rate: number | null }>;
  }>;
  exceptions: Array<{ id: string; severity: string; message: string; action: string; status: string; who: string }>;
};

function PayslipDialog({ line, currency, onClose }: {
  line: RunDetail["lines"][number];
  currency: string;
  onClose: () => void;
}) {
  const groups: Array<{ label: string; kind: "earning" | "tax" | "deduction" }> = [
    { label: "Earnings", kind: "earning" },
    { label: "Taxes", kind: "tax" },
    { label: "Deductions", kind: "deduction" },
  ];
  return (
    <Dialog
      open
      width={460}
      title={`Payslip breakdown — ${line.name}`}
      description="Every component as calculated; use this to verify against your accountant's numbers."
      onClose={onClose}
      footer={<Button variant="secondary" size="sm" onClick={onClose}>Close</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {groups.map((g) => {
          const items = line.items.filter((i) => i.kind === g.kind);
          if (items.length === 0) return null;
          return (
            <div key={g.kind} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "var(--label-caps)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>{g.label}</span>
              {items.map((i, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-1)", flex: 1 }}>
                    {i.name}{i.quantity != null ? ` · ${i.quantity}${i.rate != null ? ` × ${formatMoney(i.rate, currency)}` : ""}` : ""}
                  </span>
                  <span style={{ font: "var(--data-md)", fontSize: "var(--text-xs)", color: g.kind === "earning" ? "var(--text-1)" : "var(--danger-text)" }}>
                    {g.kind === "earning" ? "" : "−"}{formatMoney(i.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
        <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: 10, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)", flex: 1 }}>Net pay</span>
          <span style={{ font: "var(--data-md)", fontSize: "var(--text-md)", color: "var(--success-text)" }}>{formatMoney(line.net, currency)}</span>
        </div>
      </div>
    </Dialog>
  );
}

const STEPS = ["Draft", "In review", "Approved", "Processed"];
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  calculating: "Calculating",
  in_review: "In review",
  approved: "Approved",
  processed: "Processed",
  cancelled: "Cancelled",
};
const STATUS_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  in_review: "warning",
  approved: "info",
  processed: "success",
  cancelled: "neutral",
};
const SEVERITY_TONE: Record<string, BadgeTone> = { blocker: "danger", warning: "warning", info: "info" };

function RunTimeline({ current }: { current: string }) {
  const idx = STEPS.indexOf(STATUS_LABEL[current] ?? "Draft");
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
            }}>
              {i < idx ? <Icon name="check" size={11} color="#fff" /> : null}
            </span>
            <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: i <= idx ? "var(--text-1)" : "var(--text-3)" }}>{s}</span>
          </div>
          {i < STEPS.length - 1 ? <span style={{ width: 36, height: 1, background: "var(--border-2)", margin: "0 10px" }} /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function PayrollAdmin({ periods, detail }: { periods: PeriodRow[]; detail: RunDetail | null }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [payslip, setPayslip] = React.useState<RunDetail["lines"][number] | null>(null);

  const calculate = async (periodId: string) => {
    setBusy(periodId);
    setError(null);
    const res = await fetch("/api/payroll/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(body.error ?? "Calculation failed");
      return;
    }
    router.push(`/payroll?run=${body.runId}`);
    router.refresh();
  };

  const transition = async (action: string) => {
    if (!detail) return;
    setBusy(action);
    setError(null);
    const res = await fetch("/api/payroll/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: detail.id, action }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) setError(body.error ?? "Transition failed");
    router.refresh();
  };

  const decideException = async (id: string, status: "resolved" | "waived") => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("payroll_exceptions").update({
      status,
      resolved_by: user?.id ?? null,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    router.refresh();
  };

  const openBlockers = detail?.exceptions.filter((e) => e.severity === "blocker" && e.status === "open").length ?? 0;

  return (
    <Page
      eyebrow="Operations"
      title="Payroll"
      actions={
        <Button variant="secondary" size="sm" icon={<Icon name="gift" size={14} />} onClick={() => router.push("/payroll/thirteenth")}>
          13th-month
        </Button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {error ? <Banner tone="danger" title="Payroll action failed" description={error} /> : null}

        <Card title="Pay periods" subtitle="Calculate a draft run, then review → approve → process" padding="0">
          <Table
            compact
            rowKey="id"
            columns={[
              { key: "group", label: "Pay group" },
              { key: "label", label: "Period", mono: true },
              { key: "payDate", label: "Pay date", mono: true },
              { key: "status", label: "Run", render: (r) => (
                r.run
                  ? <Badge tone={STATUS_TONE[r.run.status] ?? "neutral"} dot>{STATUS_LABEL[r.run.status] ?? r.run.status}</Badge>
                  : <Badge tone="neutral">Not calculated</Badge>
              )},
              { key: "actions", label: "", align: "right", render: (r) => (
                <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {r.run ? (
                    <Button size="sm" variant="ghost" onClick={() => { router.push(`/payroll?run=${r.run!.id}`); }}>View</Button>
                  ) : null}
                  {r.periodStatus === "open" && (!r.run || r.run.status === "draft") ? (
                    <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => calculate(r.id)}>
                      {busy === r.id ? "Calculating…" : r.run ? "Recalculate" : "Calculate"}
                    </Button>
                  ) : null}
                </span>
              )},
            ]}
            rows={periods}
          />
        </Card>

        {detail ? (
          <React.Fragment>
            <Card
              title={`${detail.group} · ${detail.periodLabel}`}
              subtitle={`Pay date ${detail.payDate} · ${detail.totals.employees} employees`}
              actions={
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {detail.status === "draft" ? (
                    <Button size="sm" variant="primary" disabled={!!busy} onClick={() => transition("submit")}>Submit for review</Button>
                  ) : null}
                  {detail.status === "in_review" ? (
                    <Button size="sm" variant="primary" disabled={!!busy || openBlockers > 0} onClick={() => transition("approve")}>
                      {openBlockers > 0 ? `${openBlockers} blocker(s) open` : "Approve run"}
                    </Button>
                  ) : null}
                  {detail.status === "approved" ? (
                    <Button size="sm" variant="primary" disabled={!!busy} onClick={() => transition("process")}>Mark processed</Button>
                  ) : null}
                </span>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <RunTimeline current={detail.status} />
                <div style={{ display: "flex", gap: 40 }}>
                  <Stat label="Gross" value={formatMoney(detail.totals.gross, detail.currency)} />
                  <Stat label="Taxes" value={formatMoney(detail.totals.taxes, detail.currency)} />
                  <Stat label="Deductions" value={formatMoney(detail.totals.deductions, detail.currency)} />
                  <Stat label="Net pay" value={formatMoney(detail.totals.net, detail.currency)} />
                </div>
              </div>
            </Card>

            {detail.exceptions.length > 0 ? (
              <Card title="Exceptions" subtitle="Blockers must be resolved or waived before approval" padding="0">
                <Table
                  compact
                  rowKey="id"
                  columns={[
                    { key: "severity", label: "Severity", render: (r) => <Badge tone={SEVERITY_TONE[r.severity] ?? "neutral"} dot>{r.severity}</Badge> },
                    { key: "who", label: "Employee" },
                    { key: "message", label: "Issue" },
                    { key: "action", label: "Suggested action" },
                    { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "open" ? "warning" : "success"}>{r.status}</Badge> },
                    { key: "actions", label: "", align: "right", render: (r) => (
                      r.status === "open" ? (
                        <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Button size="sm" variant="ghost" onClick={() => decideException(r.id, "waived")}>Waive</Button>
                          <Button size="sm" variant="secondary" onClick={() => decideException(r.id, "resolved")}>Resolve</Button>
                        </span>
                      ) : null
                    )},
                  ]}
                  rows={detail.exceptions}
                />
              </Card>
            ) : null}

            <Card
              title="Register"
              subtitle="Per-employee lines for this run"
              padding="0"
              actions={
                detail.lines.length > 0 ? (
                  <span style={{ display: "flex", gap: 6 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Icon name="download" size={13} />}
                      onClick={async () => {
                        const { downloadCsv } = await import("@/lib/csv");
                        downloadCsv(
                          `payroll-register-${detail.periodLabel.replace(/[^\d-]/g, "")}.csv`,
                          ["Employee", "Currency", "Gross", "Taxes", "Deductions", "Net", "Notes"],
                          detail.lines.map((l) => [l.name, detail.currency, l.gross, l.taxes, l.deductions, l.net, l.change])
                        );
                      }}
                    >
                      Register CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Icon name="download" size={13} />}
                      onClick={async () => {
                        const { downloadCsv } = await import("@/lib/csv");
                        downloadCsv(
                          `payroll-components-${detail.periodLabel.replace(/[^\d-]/g, "")}.csv`,
                          ["Employee", "Component", "Kind", "Currency", "Amount", "Quantity", "Rate"],
                          detail.lines.flatMap((l) => l.items.map((i) => [l.name, i.name, i.kind, detail.currency, i.amount, i.quantity, i.rate]))
                        );
                      }}
                    >
                      Components CSV
                    </Button>
                  </span>
                ) : null
              }
            >
              {detail.lines.length === 0 ? (
                <EmptyState icon={<Icon name="banknote" size={18} />} title="No lines" description="Everyone was excluded — check the exceptions." />
              ) : (
                <Table
                  compact
                  rowKey="id"
                  onRowClick={(r) => setPayslip(r)}
                  columns={[
                    { key: "name", label: "Employee" },
                    { key: "gross", label: "Gross", mono: true, align: "right", render: (r) => <span>{formatMoney(r.gross, detail.currency)}</span> },
                    { key: "taxes", label: "Taxes", mono: true, align: "right", render: (r) => <span>{formatMoney(r.taxes, detail.currency)}</span> },
                    { key: "deductions", label: "Deductions", mono: true, align: "right", render: (r) => <span>{formatMoney(r.deductions, detail.currency)}</span> },
                    { key: "net", label: "Net", mono: true, align: "right", render: (r) => (
                      <span style={{ font: "var(--data-md)", color: "var(--success-text)" }}>{formatMoney(r.net, detail.currency)}</span>
                    )},
                    { key: "change", label: "Notes" },
                  ]}
                  rows={detail.lines}
                />
              )}
            </Card>
          </React.Fragment>
        ) : (
          <Card>
            <EmptyState
              icon={<Icon name="calculator" size={18} />}
              title="No run selected"
              description="Calculate a pay period above to produce a draft register with statutory deductions, overtime, and exceptions."
            />
          </Card>
        )}
      </div>
      {payslip && detail ? <PayslipDialog line={payslip} currency={detail.currency} onClose={() => setPayslip(null)} /> : null}
    </Page>
  );
}
