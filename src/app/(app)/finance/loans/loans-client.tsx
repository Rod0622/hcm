"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Badge, Button, Card, Dialog, EmptyState, Icon, IconButton, Input, SegmentedControl, Stat, Table } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { financeApi } from "@/lib/finance/api";
import { buildLoanSchedule, pctOf, round2, todayIso, type LoanPaymentRow, type LoanRow } from "@/lib/finance/calc";

const php = (n: number) => formatMoney(n, "PHP");
const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function LoanDialog({ loan, onClose }: { loan: LoanRow | null; onClose: () => void }) {
  const router = useRouter();
  const [bank, setBank] = React.useState(loan?.bank_name ?? "");
  const [loanDate, setLoanDate] = React.useState(loan?.loan_date ?? todayIso());
  const [principal, setPrincipal] = React.useState(loan ? String(loan.principal) : "");
  const [rate, setRate] = React.useState(loan?.interest_rate != null ? String(loan.interest_rate) : "");
  const [interest, setInterest] = React.useState(loan ? String(loan.interest_amount) : "0");
  const [term, setTerm] = React.useState(loan ? String(loan.term_months) : "1");
  const [repayment, setRepayment] = React.useState<"lump_sum" | "monthly">(loan?.repayment ?? "lump_sum");
  const [notes, setNotes] = React.useState(loan?.notes ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* Editing is limited to name/notes — amounts and term define the payment
     schedule, so a mistake there means delete and re-record. */
  const amountsLocked = Boolean(loan);

  const preview = !amountsLocked && num(principal) > 0 && Number.isInteger(Number(term)) && Number(term) >= 1
    ? buildLoanSchedule(loanDate, num(principal), num(interest), Number(term), repayment)
    : [];

  const save = async () => {
    setBusy(true);
    setError(null);
    const err = loan
      ? await financeApi("loans", "PATCH", { id: loan.id, bank_name: bank, notes })
      : await financeApi("loans", "POST", {
          bank_name: bank,
          loan_date: loanDate,
          principal: num(principal),
          interest_rate: rate.trim() === "" ? null : num(rate),
          interest_amount: num(interest),
          term_months: Number(term),
          repayment,
          notes,
        });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open
      title={loan ? `Edit ${loan.bank_name} loan` : "Record bank loan"}
      description={loan ? "Amounts and term are locked once the schedule exists — delete and re-record to change them." : "The repayment schedule is generated from the term."}
      onClose={onClose}
      width={520}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : loan ? "Save changes" : "Record loan"}</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12 }}>
          <Input label="Bank" placeholder="e.g. BDO" value={bank} onChange={(e) => setBank(e.target.value)} />
          <Input label="Loan date" type="date" mono value={loanDate} disabled={amountsLocked} onChange={(e) => setLoanDate(e.target.value)} />
        </div>
        <Input
          label="Amount borrowed"
          mono
          prefix="₱"
          placeholder="e.g. 100000"
          value={principal}
          disabled={amountsLocked}
          onChange={(e) => {
            setPrincipal(e.target.value);
            if (rate.trim() !== "") setInterest(String(pctOf(num(e.target.value), num(rate))));
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12 }}>
          <Input
            label="Interest %"
            mono
            suffix="%"
            placeholder="e.g. 5"
            value={rate}
            disabled={amountsLocked}
            onChange={(e) => {
              setRate(e.target.value);
              if (e.target.value.trim() !== "") setInterest(String(pctOf(num(principal), num(e.target.value))));
            }}
          />
          <Input
            label="Total interest for the term"
            mono
            prefix="₱"
            value={interest}
            disabled={amountsLocked}
            onChange={(e) => { setInterest(e.target.value); setRate(""); }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, alignItems: "end" }}>
          <Input label="Term (months)" mono value={term} disabled={amountsLocked} onChange={(e) => setTerm(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "var(--label-md)", color: "var(--text-1)" }}>Repayment</span>
            <SegmentedControl
              options={[{ value: "lump_sum", label: "One payment at the end" }, { value: "monthly", label: "Monthly installments" }]}
              value={repayment}
              onChange={(v: string) => { if (!amountsLocked) setRepayment(v === "monthly" ? "monthly" : "lump_sum"); }}
            />
          </div>
        </div>
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {preview.length > 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px",
            background: "var(--bg-inset)", border: "1px solid var(--border-1)", borderRadius: "var(--radius-md)",
            font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)",
          }}>
            <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
              Total payable {php(round2(num(principal) + num(interest)))} across {preview.length} payment{preview.length === 1 ? "" : "s"}:
            </span>
            {preview.slice(0, 6).map((p) => (
              <span key={p.due_date} style={{ font: "var(--weight-regular) var(--text-xs)/1.6 var(--font-mono)" }}>
                {p.due_date} — {php(p.amount_due)}
              </span>
            ))}
            {preview.length > 6 ? <span>… and {preview.length - 6} more</span> : null}
          </div>
        ) : null}
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

export function Loans({ loans, payments }: { loans: LoanRow[]; payments: LoanPaymentRow[] }) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<{ open: boolean; loan: LoanRow | null }>({ open: false, loan: null });
  const [expanded, setExpanded] = React.useState<string | null>(loans.find((l) => l.status === "active")?.id ?? null);
  const [rowError, setRowError] = React.useState<string | null>(null);
  const today = todayIso();

  const paymentsOf = (loanId: string) => payments.filter((p) => p.loan_id === loanId);
  const outstanding = (loanId: string) => round2(paymentsOf(loanId).filter((p) => !p.paid).reduce((s, p) => s + p.amount_due, 0));
  const totalOutstanding = round2(payments.filter((p) => !p.paid).reduce((s, p) => s + p.amount_due, 0));
  const overdue = payments.filter((p) => !p.paid && p.due_date < today);

  const togglePaid = async (p: LoanPaymentRow) => {
    const err = await financeApi("loan-payments", "PATCH", { id: p.id, paid: !p.paid });
    setRowError(err);
    if (!err) router.refresh();
  };

  const remove = async (loan: LoanRow) => {
    if (!window.confirm(`Delete the ${loan.bank_name} loan and its payment schedule? This cannot be undone.`)) return;
    const err = await financeApi("loans", "DELETE", { id: loan.id });
    setRowError(err);
    if (!err) router.refresh();
  };

  return (
    <Page
      eyebrow="Finance"
      title="Bank loans"
      actions={
        <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setDialog({ open: true, loan: null })}>
          Record loan
        </Button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <Stat label="Still owed to banks" value={php(totalOutstanding)} hint={`${loans.filter((l) => l.status === "active").length} active loan(s)`} />
            <Stat
              label="Overdue payments"
              value={String(overdue.length)}
              hint={overdue.length ? php(round2(overdue.reduce((s, p) => s + p.amount_due, 0))) + " past due" : "All on schedule"}
              deltaTone={overdue.length ? "danger" : "neutral"}
            />
            <Stat
              label="Borrowed all-time"
              value={php(round2(loans.reduce((s, l) => s + l.principal, 0)))}
              hint={`${php(round2(loans.reduce((s, l) => s + l.interest_amount, 0)))} total interest`}
            />
          </div>
        </Card>

        {rowError ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{rowError}</span> : null}

        {loans.length === 0 ? (
          <Card padding="0">
            <EmptyState
              icon={<Icon name="landmark" size={18} />}
              title="No bank loans"
              description="Record a loan with its interest and term to get a payment schedule."
              action={<Button variant="primary" size="sm" onClick={() => setDialog({ open: true, loan: null })}>Record loan</Button>}
            />
          </Card>
        ) : (
          loans.map((loan) => {
            const rows = paymentsOf(loan.id);
            const open = expanded === loan.id;
            return (
              <Card
                key={loan.id}
                padding="0"
                title={loan.bank_name}
                subtitle={`${php(loan.principal)} on ${loan.loan_date} · ${loan.term_months} month${loan.term_months === 1 ? "" : "s"} · ${loan.repayment === "monthly" ? "monthly installments" : "lump sum"} · pay back ${php(loan.total_payable)}${loan.interest_rate != null ? ` (${loan.interest_rate}% interest)` : ""}`}
                actions={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {loan.status === "paid"
                      ? <Badge tone="success">Fully paid</Badge>
                      : <Badge tone="warning">{php(outstanding(loan.id))} left</Badge>}
                    <IconButton label="Edit" onClick={() => setDialog({ open: true, loan })}>
                      <Icon name="pencil" size={14} />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => remove(loan)}>
                      <Icon name="trash-2" size={14} />
                    </IconButton>
                    <IconButton label={open ? "Collapse" : "Show schedule"} onClick={() => setExpanded(open ? null : loan.id)}>
                      <Icon name={open ? "chevron-up" : "chevron-down"} size={14} />
                    </IconButton>
                  </span>
                }
              >
                {open ? (
                  <Table
                    rowKey="id"
                    compact
                    columns={[
                      { key: "due_date", label: "Due date", mono: true },
                      { key: "amount_due", label: "Amount", mono: true, align: "right", render: (r: LoanPaymentRow) => php(r.amount_due) },
                      { key: "state", label: "Status", render: (r: LoanPaymentRow) =>
                        r.paid
                          ? <Badge tone="success">Paid {r.paid_date ?? ""}</Badge>
                          : r.due_date < today
                            ? <Badge tone="danger">Overdue</Badge>
                            : <Badge tone="neutral">Upcoming</Badge> },
                      { key: "actions", label: "", align: "right", render: (r: LoanPaymentRow) => (
                        <Button variant="secondary" size="sm" onClick={() => togglePaid(r)}>
                          {r.paid ? "Undo" : "Mark paid"}
                        </Button>
                      )},
                    ]}
                    rows={rows}
                  />
                ) : null}
              </Card>
            );
          })
        )}
      </div>
      {dialog.open ? <LoanDialog loan={dialog.loan} onClose={() => setDialog({ open: false, loan: null })} /> : null}
    </Page>
  );
}
