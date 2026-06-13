"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Stat, Badge, Button, Table, Select, EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export type ThirteenthRow = {
  id: string;
  name: string;
  currency: string;
  monthlyBasic: number;
  months: number;
  source: string;
  earned: number;
  amount: number;
  taxExempt: number;
  taxableExcess: number;
};

export function Thirteenth({ rows, year }: { rows: ThirteenthRow[]; year: number }) {
  const router = useRouter();
  const currency = rows[0]?.currency ?? "PHP";
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const taxable = rows.reduce((s, r) => s + r.taxableExcess, 0);
  const years = [year + 1, year, year - 1, year - 2].filter((y, i, a) => a.indexOf(y) === i);

  const exportCsv = async () => {
    const { downloadCsv } = await import("@/lib/csv");
    downloadCsv(
      `13th-month-${year}.csv`,
      ["Employee", "Currency", "Monthly basic", "Months", "Basis", "Basic earned", "13th-month", "Tax-exempt", "Taxable excess"],
      rows.map((r) => [r.name, r.currency, r.monthlyBasic, r.months, r.source, r.earned, r.amount, r.taxExempt, r.taxableExcess])
    );
  };

  return (
    <Page
      eyebrow="Operations"
      title="13th-month pay"
      actions={
        <React.Fragment>
          <Select
            options={years.map((y) => String(y))}
            value={String(year)}
            onChange={(e) => router.push(`/payroll/thirteenth?year=${e.target.value}`)}
            style={{ width: 110 }}
          />
          <Button variant="secondary" size="sm" icon={<Icon name="download" size={14} />} onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <Card>
          <div style={{ display: "flex", gap: 40 }}>
            <Stat label={`Total 13th-month ${year}`} value={formatMoney(total, currency)} />
            <Stat label="PH employees" value={String(rows.length)} />
            <Stat label="Taxable excess (> ₱90k)" value={formatMoney(taxable, currency)} />
          </div>
        </Card>

        <Card
          title="Worksheet"
          subtitle="Basic salary earned this year ÷ 12 · tax-exempt up to ₱90,000. Prorated from monthly basic until processed runs exist."
          padding="0"
        >
          {rows.length === 0 ? (
            <EmptyState icon={<Icon name="gift" size={18} />} title="No PH employees" description="13th-month pay applies to Philippine employees." />
          ) : (
            <Table
              rowKey="id"
              columns={[
                { key: "name", label: "Employee" },
                { key: "monthlyBasic", label: "Monthly basic", mono: true, align: "right", render: (r) => <span>{formatMoney(r.monthlyBasic, r.currency)}</span> },
                { key: "months", label: "Months", mono: true, align: "right" },
                { key: "source", label: "Basis", render: (r) => <Badge tone={r.source === "run history" ? "success" : "neutral"}>{r.source}</Badge> },
                { key: "earned", label: "Basic earned", mono: true, align: "right", render: (r) => <span>{formatMoney(r.earned, r.currency)}</span> },
                { key: "amount", label: "13th-month", mono: true, align: "right", render: (r) => (
                  <span style={{ font: "var(--data-md)", color: "var(--success-text)" }}>{formatMoney(r.amount, r.currency)}</span>
                )},
                { key: "taxableExcess", label: "Taxable excess", mono: true, align: "right", render: (r) => (
                  <span style={{ color: r.taxableExcess > 0 ? "var(--warning-text)" : "var(--text-3)" }}>{r.taxableExcess > 0 ? formatMoney(r.taxableExcess, r.currency) : "—"}</span>
                )},
              ]}
              rows={rows}
            />
          )}
        </Card>
      </div>
    </Page>
  );
}
