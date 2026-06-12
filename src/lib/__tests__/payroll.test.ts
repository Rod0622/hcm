import { describe, expect, it } from "vitest";
import { calculateLine, type PayLine } from "../payroll/engine";
import { birWithholdingSemiMonthly, phStatutory } from "../payroll/statutory";

function asLine(r: ReturnType<typeof calculateLine>): PayLine {
  if ("excluded" in r) throw new Error("expected a line");
  return r;
}

describe("PH statutory", () => {
  it("caps SSS, PhilHealth, and Pag-IBIG at their ceilings", () => {
    // High earner: monthly 266,666 — everything at ceiling
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
    const line = asLine(calculateLine(
      { workerId: "w", name: "Rod", country: "PH", annualBase: 3200000, otMinutes: 0, unpaidLeaveDays: 0, newHire: false },
      "semi_monthly"
    ));
    expect(line.gross).toBe(133333.33);
    expect(line.net).toBeCloseTo(line.gross - line.taxes - line.deductions, 2);
    expect(line.items.map((i) => i.code)).toContain("ph_bir_wh");
  });

  it("adds overtime at 1.25x and deducts unpaid leave", () => {
    const line = asLine(calculateLine(
      { workerId: "w", name: "Joy", country: "PH", annualBase: 2400000, otMinutes: 120, unpaidLeaveDays: 1, newHire: true },
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
    const r = calculateLine(
      { workerId: "w", name: "Ghost", country: "PH", annualBase: null, otMinutes: 0, unpaidLeaveDays: 0, newHire: false },
      "semi_monthly"
    );
    expect("excluded" in r).toBe(true);
    if ("excluded" in r) expect(r.exception.severity).toBe("blocker");
  });

  it("flags negative net as a blocker", () => {
    const line = asLine(calculateLine(
      { workerId: "w", name: "Edge", country: "PH", annualBase: 240000, otMinutes: 0, unpaidLeaveDays: 12, newHire: false },
      "semi_monthly"
    ));
    expect(line.exceptions.some((e) => e.code === "negative_net")).toBe(true);
  });
});
