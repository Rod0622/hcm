/* Pure money math for the personal financing tracker. Amounts are pesos with
   2-decimal precision; rates are plain percentages (10 = 10%). */

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function pctOf(principal: number, ratePct: number) {
  return round2(principal * (ratePct / 100));
}

/* ISO date (YYYY-MM-DD) arithmetic, no timezone surprises. */
export function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* Month arithmetic clamps to the last day of the target month
   (Jan 31 + 1 month → Feb 28/29). */
export function addMonths(iso: string, months: number) {
  const [y, m, day] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- rows as stored in the Financing project ---------- */

export type PersonRow = {
  id: string;
  name: string;
  is_me: boolean;
  notes: string;
};

export type InvestmentRow = {
  id: string;
  transaction_date: string;
  financer_id: string;
  principal: number;
  interest_rate: number | null;
  interest_amount: number;
  maturity_date: string;
  business_return_rate: number | null;
  business_return_amount: number;
  referrer_id: string | null;
  referrer_cut_rate: number | null;
  referrer_cut_amount: number;
  payout_due: number;
  my_profit: number;
  status: "active" | "paid";
  paid_date: string | null;
  notes: string;
};

export type LoanRow = {
  id: string;
  bank_name: string;
  loan_date: string;
  principal: number;
  interest_rate: number | null;
  interest_amount: number;
  term_months: number;
  repayment: "lump_sum" | "monthly";
  total_payable: number;
  status: "active" | "paid";
  notes: string;
};

export type LoanPaymentRow = {
  id: string;
  loan_id: string;
  due_date: string;
  amount_due: number;
  paid: boolean;
  paid_date: string | null;
};

/* What each party walks away with on one investment. */
export function investmentSplit(inv: Pick<InvestmentRow, "principal" | "interest_amount" | "business_return_amount" | "referrer_cut_amount">) {
  return {
    financerPayout: round2(inv.principal + inv.interest_amount),
    referrerCut: round2(inv.referrer_cut_amount),
    myProfit: round2(inv.business_return_amount - inv.interest_amount - inv.referrer_cut_amount),
  };
}

/* Repayment schedule for a bank loan: equal monthly installments (the last
   one absorbs rounding) or a single lump sum at the end of the term. */
export function buildLoanSchedule(
  loanDate: string,
  principal: number,
  interestAmount: number,
  termMonths: number,
  repayment: "lump_sum" | "monthly"
): Array<{ due_date: string; amount_due: number }> {
  const total = round2(principal + interestAmount);
  if (repayment === "lump_sum" || termMonths <= 1) {
    return [{ due_date: addMonths(loanDate, termMonths), amount_due: total }];
  }
  const per = round2(total / termMonths);
  const rows = [];
  for (let i = 1; i <= termMonths; i++) {
    const amount = i === termMonths ? round2(total - per * (termMonths - 1)) : per;
    rows.push({ due_date: addMonths(loanDate, i), amount_due: amount });
  }
  return rows;
}

/* ---------- reporting ---------- */

export type PersonReportLine = {
  personId: string;
  name: string;
  isMe: boolean;
  invested: number;
  interestEarned: number;
  referralEarned: number;
  deals: number;
};

/* Per-person totals for one month ("YYYY-MM") or all time, grouped by the
   month the money came in (transaction_date). A person can appear both as a
   financer (invested + interest) and as a referrer (referral cuts). */
export function personReport(
  investments: InvestmentRow[],
  people: PersonRow[],
  month: string | "all"
): { lines: PersonReportLine[]; myProfit: number; totalInvested: number } {
  const inMonth = month === "all" ? investments : investments.filter((i) => monthKey(i.transaction_date) === month);
  const byId = new Map(people.map((p) => [p.id, p]));
  const lines = new Map<string, PersonReportLine>();
  const line = (id: string): PersonReportLine => {
    let l = lines.get(id);
    if (!l) {
      const p = byId.get(id);
      l = { personId: id, name: p?.name ?? "Unknown", isMe: p?.is_me ?? false, invested: 0, interestEarned: 0, referralEarned: 0, deals: 0 };
      lines.set(id, l);
    }
    return l;
  };

  let myProfit = 0;
  let totalInvested = 0;
  for (const inv of inMonth) {
    const f = line(inv.financer_id);
    f.invested = round2(f.invested + inv.principal);
    f.interestEarned = round2(f.interestEarned + inv.interest_amount);
    f.deals += 1;
    totalInvested = round2(totalInvested + inv.principal);
    if (inv.referrer_id) {
      const r = line(inv.referrer_id);
      r.referralEarned = round2(r.referralEarned + inv.referrer_cut_amount);
    }
    myProfit = round2(myProfit + investmentSplit(inv).myProfit);
  }

  const sorted = [...lines.values()].sort((a, b) =>
    round2(b.interestEarned + b.referralEarned) - round2(a.interestEarned + a.referralEarned)
  );
  return { lines: sorted, myProfit, totalInvested };
}

export type LedgerEntry = {
  date: string;
  label: string;
  detail: string;
  moneyIn: number;
  moneyOut: number;
};

/* Actual cash movements, newest first: capital in on the transaction date,
   payouts (capital + interest + referral cut) out when settled, loan
   proceeds in on the loan date, loan payments out when paid. */
export function buildLedger(
  investments: InvestmentRow[],
  people: PersonRow[],
  loans: LoanRow[],
  payments: LoanPaymentRow[]
): LedgerEntry[] {
  const name = (id: string | null) => people.find((p) => p.id === id)?.name ?? "Unknown";
  const entries: LedgerEntry[] = [];

  for (const inv of investments) {
    entries.push({
      date: inv.transaction_date,
      label: `Capital in — ${name(inv.financer_id)}`,
      detail: "Investment received",
      moneyIn: inv.principal,
      moneyOut: 0,
    });
    if (inv.status === "paid") {
      const split = investmentSplit(inv);
      entries.push({
        date: inv.paid_date ?? inv.maturity_date,
        label: `Payout — ${name(inv.financer_id)}`,
        detail: "Capital + interest returned",
        moneyIn: 0,
        moneyOut: split.financerPayout,
      });
      if (inv.referrer_id && split.referrerCut > 0) {
        entries.push({
          date: inv.paid_date ?? inv.maturity_date,
          label: `Referral cut — ${name(inv.referrer_id)}`,
          detail: `For referring ${name(inv.financer_id)}`,
          moneyIn: 0,
          moneyOut: split.referrerCut,
        });
      }
    }
  }

  const loanById = new Map(loans.map((l) => [l.id, l]));
  for (const loan of loans) {
    entries.push({
      date: loan.loan_date,
      label: `Bank loan — ${loan.bank_name}`,
      detail: "Loan proceeds received",
      moneyIn: loan.principal,
      moneyOut: 0,
    });
  }
  for (const p of payments) {
    if (!p.paid) continue;
    entries.push({
      date: p.paid_date ?? p.due_date,
      label: `Loan payment — ${loanById.get(p.loan_id)?.bank_name ?? "Bank"}`,
      detail: "Installment paid",
      moneyIn: 0,
      moneyOut: p.amount_due,
    });
  }

  return entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
