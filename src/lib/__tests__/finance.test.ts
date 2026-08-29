import { describe, expect, it } from "vitest";
import {
  addDays, addMonths, buildLedger, buildLoanSchedule, investmentSplit, monthKey, pctOf, personReport, round2,
  type InvestmentRow, type LoanPaymentRow, type LoanRow, type PersonRow,
} from "../finance/calc";

const people: PersonRow[] = [
  { id: "me", name: "Me (own capital)", is_me: true, notes: "" },
  { id: "ana", name: "Ana", is_me: false, notes: "" },
  { id: "ben", name: "Ben", is_me: false, notes: "" },
];

function inv(partial: Partial<InvestmentRow>): InvestmentRow {
  const base: InvestmentRow = {
    id: "x",
    transaction_date: "2026-08-01",
    financer_id: "ana",
    principal: 50000,
    interest_rate: 5,
    interest_amount: 2500,
    maturity_date: "2026-08-31",
    business_return_rate: 10,
    business_return_amount: 5000,
    referrer_id: null,
    referrer_cut_rate: null,
    referrer_cut_amount: 0,
    payout_due: 52500,
    my_profit: 2500,
    status: "active",
    paid_date: null,
    notes: "",
  };
  return { ...base, ...partial };
}

describe("date math", () => {
  it("adds days across month ends", () => {
    expect(addDays("2026-08-15", 30)).toBe("2026-09-14");
    expect(addDays("2026-12-25", 30)).toBe("2027-01-24");
  });

  it("adds months clamping to short months", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29"); // leap year
    expect(addMonths("2026-08-29", 3)).toBe("2026-11-29");
  });

  it("derives amounts from manual percentages", () => {
    expect(pctOf(50000, 5)).toBe(2500);
    expect(pctOf(33333, 7.5)).toBe(2499.98);
  });
});

describe("investmentSplit", () => {
  it("splits a referred deal: financer payout, referrer cut, my profit", () => {
    const split = investmentSplit(inv({ referrer_id: "ben", referrer_cut_amount: 500 }));
    expect(split.financerPayout).toBe(52500); // capital + interest
    expect(split.referrerCut).toBe(500);
    expect(split.myProfit).toBe(2000); // 5000 return − 2500 interest − 500 cut
  });

  it("gives the whole return when the money is mine", () => {
    const split = investmentSplit(inv({ financer_id: "me", interest_amount: 0, referrer_cut_amount: 0 }));
    expect(split.financerPayout).toBe(50000);
    expect(split.myProfit).toBe(5000);
  });
});

describe("buildLoanSchedule", () => {
  it("lump sum: one payment of principal + interest at the end of the term", () => {
    const s = buildLoanSchedule("2026-08-29", 100000, 5000, 3, "lump_sum");
    expect(s).toEqual([{ due_date: "2026-11-29", amount_due: 105000 }]);
  });

  it("monthly: equal installments, last absorbs rounding, sums to total", () => {
    const s = buildLoanSchedule("2026-08-29", 100000, 0, 3, "monthly");
    expect(s.map((p) => p.due_date)).toEqual(["2026-09-29", "2026-10-29", "2026-11-29"]);
    expect(s.map((p) => p.amount_due)).toEqual([33333.33, 33333.33, 33333.34]);
    expect(round2(s.reduce((t, p) => t + p.amount_due, 0))).toBe(100000);
  });

  it("one-month term is a single payment either way", () => {
    expect(buildLoanSchedule("2026-08-29", 20000, 800, 1, "monthly")).toEqual([
      { due_date: "2026-09-29", amount_due: 20800 },
    ]);
  });
});

describe("personReport", () => {
  const deals = [
    inv({ id: "a", transaction_date: "2026-08-05", financer_id: "ana", referrer_id: "ben", referrer_cut_amount: 500 }),
    inv({ id: "b", transaction_date: "2026-08-20", financer_id: "ben", principal: 20000, interest_amount: 1200, business_return_amount: 2000 }),
    inv({ id: "c", transaction_date: "2026-07-10", financer_id: "ana", principal: 10000, interest_amount: 600, business_return_amount: 1000 }),
    inv({ id: "d", transaction_date: "2026-08-25", financer_id: "me", principal: 30000, interest_amount: 0, business_return_amount: 3000 }),
  ];

  it("filters to one month and totals per person across both roles", () => {
    const r = personReport(deals, people, "2026-08");
    expect(r.totalInvested).toBe(100000); // 50k + 20k + 30k (July deal excluded)
    const ana = r.lines.find((l) => l.name === "Ana")!;
    expect(ana.invested).toBe(50000);
    expect(ana.interestEarned).toBe(2500);
    expect(ana.referralEarned).toBe(0);
    const ben = r.lines.find((l) => l.name === "Ben")!;
    expect(ben.invested).toBe(20000);
    expect(ben.interestEarned).toBe(1200);
    expect(ben.referralEarned).toBe(500); // cut for referring Ana, on top of his own deal
    // my profit: (5000−2500−500) + (2000−1200) + 3000 own-capital
    expect(r.myProfit).toBe(5800);
  });

  it("all-time report includes every month", () => {
    const r = personReport(deals, people, "all");
    expect(r.totalInvested).toBe(110000);
    expect(r.lines.find((l) => l.name === "Ana")!.invested).toBe(60000);
  });
});

describe("buildLedger", () => {
  it("records capital in, and payouts + referral cut out only once settled", () => {
    const deals = [
      inv({ id: "a", referrer_id: "ben", referrer_cut_amount: 500, status: "paid", paid_date: "2026-08-30" }),
      inv({ id: "b", financer_id: "ben", principal: 20000, status: "active" }),
    ];
    const loans: LoanRow[] = [{
      id: "l1", bank_name: "BDO", loan_date: "2026-08-10", principal: 100000, interest_rate: 5,
      interest_amount: 5000, term_months: 1, repayment: "lump_sum", total_payable: 105000, status: "active", notes: "",
    }];
    const payments: LoanPaymentRow[] = [
      { id: "p1", loan_id: "l1", due_date: "2026-09-10", amount_due: 105000, paid: true, paid_date: "2026-09-09" },
      { id: "p2", loan_id: "l1", due_date: "2026-10-10", amount_due: 1, paid: false, paid_date: null },
    ];

    const ledger = buildLedger(deals, people, loans, payments);
    const ins = ledger.filter((e) => e.moneyIn > 0);
    const outs = ledger.filter((e) => e.moneyOut > 0);
    expect(round2(ins.reduce((t, e) => t + e.moneyIn, 0))).toBe(170000); // 50k + 20k capital, 100k loan
    // settled deal: 52,500 payout + 500 cut; paid installment 105,000; unpaid one excluded
    expect(round2(outs.reduce((t, e) => t + e.moneyOut, 0))).toBe(158000);
    expect(ledger[0].date >= ledger[ledger.length - 1].date).toBe(true); // newest first
    expect(monthKey(ledger[0].date)).toBe("2026-09");
  });
});
