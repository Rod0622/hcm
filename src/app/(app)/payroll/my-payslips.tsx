"use client";

import * as React from "react";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Table, Stat, EmptyState, type BadgeTone } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export type PayslipRow = {
  id: string;
  period: string;
  payDate: string;
  payGroup: string;
  currency: string;
  gross: number;
  taxes: number;
  deductions: number;
  net: number;
  status: string;
};

const RUN_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  calculating: { label: "Calculating", tone: "info" },
  in_review: { label: "In review", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  processed: { label: "Paid", tone: "success" },
};

export function MyPayslips({ rows }: { rows: PayslipRow[] }) {
  const latest = rows[0];
  return (
    <Page eyebrow="Operations" title="My payroll">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {latest ? (
          <Card title="Latest pay period" subtitle={`${latest.period} · pay date ${latest.payDate} · ${latest.payGroup}`}>
            <div style={{ display: "flex", gap: 40 }}>
              <Stat label="Net pay" value={formatMoney(latest.net, latest.currency)} />
              <Stat label="Gross" value={formatMoney(latest.gross, latest.currency)} />
              <Stat label="Taxes" value={formatMoney(latest.taxes, latest.currency)} />
              <Stat label="Deductions" value={formatMoney(latest.deductions, latest.currency)} />
            </div>
          </Card>
        ) : null}

        <Card title="Payslip history" subtitle="Only your own pay is visible to you" padding="0">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Icon name="banknote" size={18} />}
              title="No payslips yet"
              description="Once you're included in a payroll run, your payslips appear here."
            />
          ) : (
            <Table
              rowKey="id"
              columns={[
                { key: "period", label: "Period", mono: true },
                { key: "payDate", label: "Pay date", mono: true },
                { key: "payGroup", label: "Pay group" },
                { key: "gross", label: "Gross", mono: true, align: "right", render: (r) => <span>{formatMoney(r.gross, r.currency)}</span> },
                { key: "taxes", label: "Taxes", mono: true, align: "right", render: (r) => <span>{formatMoney(r.taxes, r.currency)}</span> },
                { key: "deductions", label: "Deductions", mono: true, align: "right", render: (r) => <span>{formatMoney(r.deductions, r.currency)}</span> },
                { key: "net", label: "Net", mono: true, align: "right", render: (r) => (
                  <span style={{ font: "var(--data-md)", color: "var(--success-text)" }}>{formatMoney(r.net, r.currency)}</span>
                )},
                { key: "status", label: "Status", render: (r) => {
                  const s = RUN_STATUS[r.status] ?? { label: r.status, tone: "neutral" as BadgeTone };
                  return <Badge tone={s.tone} dot>{s.label}</Badge>;
                }},
              ]}
              rows={rows}
            />
          )}
        </Card>
      </div>
    </Page>
  );
}
