"use client";

import * as React from "react";
import { Page } from "@/components/app-shell";
import { Badge, Button, Card, EmptyState, Icon, Select, Stat, Table } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import {
  buildLedger, monthKey, monthLabel, personReport, round2,
  type InvestmentRow, type LedgerEntry, type LoanPaymentRow, type LoanRow, type PersonReportLine, type PersonRow,
} from "@/lib/finance/calc";

const php = (n: number) => formatMoney(n, "PHP");

export function Reports({ people, investments, loans, payments }: {
  people: PersonRow[];
  investments: InvestmentRow[];
  loans: LoanRow[];
  payments: LoanPaymentRow[];
}) {
  /* Months that have any activity, newest first. */
  const months = React.useMemo(() => {
    const keys = new Set<string>();
    for (const i of investments) keys.add(monthKey(i.transaction_date));
    for (const l of loans) keys.add(monthKey(l.loan_date));
    for (const p of payments) if (p.paid && p.paid_date) keys.add(monthKey(p.paid_date));
    return [...keys].sort().reverse();
  }, [investments, loans, payments]);

  const currentMonth = monthKey(new Date().toISOString());
  const [month, setMonth] = React.useState<string>(months.includes(currentMonth) ? currentMonth : months[0] ?? "all");

  const report = personReport(investments, people, month);
  const ledger = React.useMemo(() => {
    const all = buildLedger(investments, people, loans, payments);
    return month === "all" ? all : all.filter((e) => monthKey(e.date) === month);
  }, [investments, people, loans, payments, month]);
  const totalIn = round2(ledger.reduce((s, e) => s + e.moneyIn, 0));
  const totalOut = round2(ledger.reduce((s, e) => s + e.moneyOut, 0));

  const periodLabel = month === "all" ? "All time" : monthLabel(month);

  const exportCsv = () => {
    downloadCsv(
      `finance-report-${month}.csv`,
      ["Person", "Invested", "Interest earned", "Referral cuts", "Total earned", "Deals"],
      report.lines.map((l) => [l.name, l.invested, l.interestEarned, l.referralEarned, round2(l.interestEarned + l.referralEarned), l.deals])
    );
  };

  return (
    <Page
      eyebrow="Finance"
      title="Reports"
      actions={
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <Select
            size="sm"
            options={[{ value: "all", label: "All time" }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Button variant="secondary" size="sm" icon={<Icon name="download" size={14} />} onClick={exportCsv} disabled={report.lines.length === 0}>
            CSV
          </Button>
        </span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            <Stat label={`Received — ${periodLabel}`} value={php(report.totalInvested)} hint="Capital that came in" />
            <Stat label="My profit" value={php(report.myProfit)} hint="Return − interest − referral cuts" deltaTone={report.myProfit >= 0 ? "success" : "danger"} />
            <Stat label="Cash in" value={php(totalIn)} hint="Investments + loan proceeds" />
            <Stat label="Cash out" value={php(totalOut)} hint="Payouts, cuts, loan payments" />
          </div>
        </Card>

        <Card
          padding="0"
          title={`Per person — ${periodLabel}`}
          subtitle="What each person put in and took home, grouped by the month the money came in"
        >
          {report.lines.length === 0 ? (
            <EmptyState icon={<Icon name="chart-no-axes-column" size={18} />} title="Nothing in this period" description="Pick a different month or record an investment." />
          ) : (
            <Table
              rowKey="personId"
              compact
              columns={[
                { key: "name", label: "Person", render: (r: PersonReportLine) => (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.name}</span>
                    {r.isMe ? <Badge tone="info">Me</Badge> : null}
                  </span>
                )},
                { key: "invested", label: "Invested", mono: true, align: "right", render: (r: PersonReportLine) => php(r.invested) },
                { key: "deals", label: "Deals", mono: true, align: "right" },
                { key: "interestEarned", label: "Interest earned", mono: true, align: "right", render: (r: PersonReportLine) => php(r.interestEarned) },
                { key: "referralEarned", label: "Referral cuts", mono: true, align: "right", render: (r: PersonReportLine) => php(r.referralEarned) },
                { key: "total", label: "Total earned", mono: true, align: "right", render: (r: PersonReportLine) => (
                  <strong>{php(round2(r.interestEarned + r.referralEarned))}</strong>
                )},
              ]}
              rows={report.lines}
            />
          )}
        </Card>

        <Card padding="0" title={`Money in / out — ${periodLabel}`} subtitle="Every actual cash movement, newest first">
          {ledger.length === 0 ? (
            <EmptyState icon={<Icon name="arrow-right-left" size={18} />} title="No cash movements" description="Money shows here when investments and loans are recorded or paid out." />
          ) : (
            <Table
              rowKey="__i"
              compact
              columns={[
                { key: "date", label: "Date", mono: true },
                { key: "label", label: "Movement", render: (r: LedgerEntry & { __i: number }) => (
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.label}</span>
                    <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>{r.detail}</span>
                  </span>
                )},
                { key: "moneyIn", label: "In", mono: true, align: "right", render: (r: LedgerEntry & { __i: number }) =>
                  r.moneyIn ? <span style={{ color: "var(--success-text)" }}>+{php(r.moneyIn)}</span> : "—" },
                { key: "moneyOut", label: "Out", mono: true, align: "right", render: (r: LedgerEntry & { __i: number }) =>
                  r.moneyOut ? <span style={{ color: "var(--danger-text)" }}>−{php(r.moneyOut)}</span> : "—" },
              ]}
              rows={ledger.map((e, i) => ({ ...e, __i: i }))}
            />
          )}
        </Card>
      </div>
    </Page>
  );
}
