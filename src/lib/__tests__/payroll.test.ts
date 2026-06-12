import { describe, expect, it } from "vitest";
import { annualize, calculateLine, type PayLine, type WorkerPayInput } from "../payroll/engine";
import { birWithholdingSemiMonthly, phStatutory } from "../payroll/statutory";

function asLine(r: ReturnType<typeof calculateLine>): PayLine {
  if ("excluded" in r) throw new Error("expected a line");
  return r;
}

const base: WorkerPayInput = {
  workerId: "w",
  name: "Test",
  country: "PH",
  baseAmount: 3200000,
  baseFrequency: "annual",
  taxable: true,
  applyStatutory: true,
  otMinutes: 0,
  unpaidLeaveDays: 0,
  newHire: false,
};

describe("annualize", () => {
  it("converts quoted frequencies to annual", () => {
    expect(annualize(100000, "monthly")).toBe(1200000);
    expect(annualize(50000, "semi_monthly")).toBe(1200000);
    expect(annualize(600000, "semi_annual")).toBe(1200000);
    expect(annualize(2000, "bi_weekly")).toBe(52000);
    expect(annualize(1000, "weekly")).toBe(52000);
    expect(annualize(500, "daily")).toBe(130000);
    expect(annualize(60, "hourly")).toBe(124800);
    expect(annualize(1200000, "annual")).toBe(1200000);
  });
});

describe("PH statutory", () => {
  it("caps SSS, PhilHealth, and Pag-IBIG at their ceilings", () => {
    const items = phStatutory(266666.67, 133333.33, 2);
    const by = Object.fromEntries(items.map((i) => [i.code, i.amount]));
    expect(by.ph_sss_ee).toBe(787.5);        // 35,000 × 4.5% / 2
    expect(by.ph_philhealth_ee).toBe(1250);  // 100,000 × 2.5% / 2
    expect(by.ph_pagibig_ee).toBe(100);      // 10,000 × 2% / 2
  });

  it("applies the TRAIN semi-monthly brackets", () => {
    expect(birWithholdingSemiMonthly(10000)).toBe(0);
    expect(birWithholdingSemiMonthly(12000)).toBeCloseTo((12000 - 10417) * 0.15, 2);
    expect(birWithholdingSemiMonthly(50000)).toBeCloseTo(4270.7 + (50000 - 33333) * 0.25, 2);
  });
});

describe("calculateLine", () => {
  it("computes a PH semi-monthly line end to end", () => {
    const line = asLine(calculateLine(base, "semi_monthly"));
    expect(line.gross).toBe(133333.33);
    expect(line.net).toBeCloseTo(line.gross - line.taxes - line.deductions, 2);
    expect(line.items.map((i) => i.code)).toContain("ph_bir_wh");
  });

  it("treats a monthly-quoted salary identically to its annual equivalent", () => {
    const annual = asLine(calculateLine(base, "semi_monthly"));
    const monthly = asLine(calculateLine({ ...base, baseAmount: 3200000 / 12, baseFrequency: "monthly" }, "semi_monthly"));
    expect(monthly.gross).toBeCloseTo(annual.gross, 1);
    expect(monthly.net).toBeCloseTo(annual.net, 1);
  });

  it("skips withholding when not taxable", () => {
    const line = asLine(calculateLine({ ...base, taxable: false }, "semi_monthly"));
    expect(line.taxes).toBe(0);
    expect(line.items.some((i) => i.kind === "tax")).toBe(false);
    expect(line.deductions).toBeGreaterThan(0); // statutory still applies
    expect(line.note).toContain("Tax-exempt");
  });

  it("skips statutory deductions when disabled", () => {
    const line = asLine(calculateLine({ ...base, applyStatutory: false }, "semi_monthly"));
    expect(line.items.some((i) => i.code === "ph_sss_ee")).toBe(false);
    expect(line.deductions).toBe(0);
    expect(line.taxes).toBeGreaterThan(0); // withholding still applies
  });

  it("pays gross = net for non-taxable, no-statutory (contractor-style)", () => {
    const line = asLine(calculateLine({ ...base, taxable: false, applyStatutory: false }, "semi_monthly"));
    expect(line.net).toBe(line.gross);
  });

  it("adds overtime at 1.25x and deducts unpaid leave", () => {
    const line = asLine(calculateLine(
      { ...base, baseAmount: 2400000, otMinutes: 120, unpaidLeaveDays: 1, newHire: true },
      "semi_monthly"
    ));
    const hourly = 2400000 / (52 * 40);
    const ot = line.items.find((i) => i.code === "ot_125");
    expect(ot?.amount).toBeCloseTo(2 * hourly * 1.25, 2);
    const unpaid = line.items.find((i) => i.code === "unpaid_leave");
    expect(unpaid?.amount).toBeCloseTo(2400000 / 260, 2);
    expect(line.note).toContain("New hire");
  });

  it("excludes workers without compensation as a blocker", () => {
    const r = calculateLine({ ...base, baseAmount: null }, "semi_monthly");
    expect("excluded" in r).toBe(true);
    if ("excluded" in r) expect(r.exception.severity).toBe("blocker");
  });

  it("flags negative net as a blocker", () => {
    const line = asLine(calculateLine({ ...base, baseAmount: 240000, unpaidLeaveDays: 12 }, "semi_monthly"));
    expect(line.exceptions.some((e) => e.code === "negative_net")).toBe(true);
  });
});
