"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Badge, Button, Card, EmptyState, Icon, Stat, Table } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import {
  addDays, investmentSplit, monthKey, personReport, round2, todayIso,
  type InvestmentRow, type LoanPaymentRow, type LoanRow, type PersonRow,
} from "@/lib/finance/calc";

const php = (n: number) => formatMoney(n, "PHP");

function daysBadge(date: string, today: string) {
  const days = Math.round((new Date(date + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000);
  if (days < 0) return <Badge tone="danger">{-days}d overdue</Badge>;
  if (days === 0) return <Badge tone="danger">Due today</Badge>;
  if (days <= 7) return <Badge tone="warning">In {days}d</Badge>;
  return <Badge tone="neutral">In {days}d</Badge>;
}

export function FinanceOverview({ people, investments, loans, payments }: {
  people: PersonRow[];
  investments: InvestmentRow[];
  loans: LoanRow[];
  payments: LoanPaymentRow[];
}) {
  const router = useRouter();
  const today = todayIso();
  const personName = (id: string | null) => people.find((p) => p.id === id)?.name ?? "Unknown";

  const active = investments.filter((i) => i.status === "active");
  const deployed = round2(active.reduce((s, i) => s + i.principal, 0));
  const dueSoonCutoff = addDays(today, 30);
  const dueSoon = active.filter((i) => i.maturity_date <= dueSoonCutoff);
  const dueSoonTotal = round2(dueSoon.reduce((s, i) => {
    const split = investmentSplit(i);
    return s + split.financerPayout + split.referrerCut;
  }, 0));
  const thisMonth = personReport(investments, people, monthKey(today));
  const unpaid = payments.filter((p) => !p.paid);
  const bankOutstanding = round2(unpaid.reduce((s, p) => s + p.amount_due, 0));
  const nextPayment = unpaid[0] ?? null;
  const bankName = (loanId: string) => loans.find((l) => l.id === loanId)?.bank_name ?? "Bank";

  return (
    <Page
      eyebrow="Finance"
      title="Financing overview"
      actions={
        <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => router.push("/finance/investments")}>
          Record investment
        </Button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            <Stat label="Capital deployed" value={php(deployed)} hint={`${active.length} active investment${active.length === 1 ? "" : "s"}`} />
            <Stat label="Payouts due ≤ 30 days" value={php(dueSoonTotal)} hint="Capital + interest + referral cuts" />
            <Stat label="My profit this month" value={php(thisMonth.myProfit)} hint={`On ${php(thisMonth.totalInvested)} received`} deltaTone="success" />
            <Stat
              label="Owed to banks"
              value={php(bankOutstanding)}
              hint={nextPayment ? `Next: ${php(nextPayment.amount_due)} on ${nextPayment.due_date}` : "No pending payments"}
            />
          </div>
        </Card>

        <Card
          title="Payouts coming up"
          subtitle="Who to pay when the cheque clears — capital + interest to the financer, cut to the referrer"
          actions={<Button variant="secondary" size="sm" onClick={() => router.push("/finance/investments")}>All investments</Button>}
          padding="0"
        >
          {active.length === 0 ? (
            <EmptyState
              icon={<Icon name="hand-coins" size={18} />}
              title="No active investments"
              description="Record an investment to start tracking payouts and profit."
            />
          ) : (
            <Table
              rowKey="id"
              compact
              columns={[
                { key: "maturity_date", label: "Payout date", mono: true },
                { key: "due", label: "", render: (r: InvestmentRow) => daysBadge(r.maturity_date, today) },
                { key: "financer", label: "Financer", render: (r: InvestmentRow) => (
                  <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{personName(r.financer_id)}</span>
                )},
                { key: "payout", label: "Pay financer", mono: true, align: "right", render: (r: InvestmentRow) => php(investmentSplit(r).financerPayout) },
                { key: "cut", label: "Referral cut", mono: true, align: "right", render: (r: InvestmentRow) =>
                  r.referrer_id ? `${php(r.referrer_cut_amount)} → ${personName(r.referrer_id)}` : "—" },
                { key: "profit", label: "My profit", mono: true, align: "right", render: (r: InvestmentRow) => (
                  <span style={{ color: investmentSplit(r).myProfit >= 0 ? "var(--success-text)" : "var(--danger-text)" }}>
                    {php(investmentSplit(r).myProfit)}
                  </span>
                )},
              ]}
              rows={active.slice(0, 8)}
              onRowClick={() => router.push("/finance/investments")}
            />
          )}
        </Card>

        <Card
          title="Bank payments coming up"
          subtitle="Installments still owed"
          actions={<Button variant="secondary" size="sm" onClick={() => router.push("/finance/loans")}>All loans</Button>}
          padding="0"
        >
          {unpaid.length === 0 ? (
            <EmptyState
              icon={<Icon name="landmark" size={18} />}
              title="Nothing owed to banks"
              description="Record a bank loan to track its repayment schedule."
            />
          ) : (
            <Table
              rowKey="id"
              compact
              columns={[
                { key: "due_date", label: "Due date", mono: true },
                { key: "when", label: "", render: (r: LoanPaymentRow) => daysBadge(r.due_date, today) },
                { key: "bank", label: "Bank", render: (r: LoanPaymentRow) => bankName(r.loan_id) },
                { key: "amount_due", label: "Amount due", mono: true, align: "right", render: (r: LoanPaymentRow) => php(r.amount_due) },
              ]}
              rows={unpaid.slice(0, 8)}
              onRowClick={() => router.push("/finance/loans")}
            />
          )}
        </Card>
      </div>
    </Page>
  );
}
