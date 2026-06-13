import { describe, expect, it } from "vitest";
import { monthsWorkedInYear, TAX_EXEMPT_CAP, thirteenthMonth } from "../payroll/thirteenth";

describe("thirteenthMonth", () => {
  it("is basic earned divided by 12", () => {
    expect(thirteenthMonth(600000).amount).toBe(50000);
  });

  it("splits at the ₱90k tax-exempt cap", () => {
    const low = thirteenthMonth(600000); // 50k → fully exempt
    expect(low.taxExempt).toBe(50000);
    expect(low.taxableExcess).toBe(0);

    const high = thirteenthMonth(1440000); // 120k → 90k exempt, 30k taxable
    expect(high.amount).toBe(120000);
    expect(high.taxExempt).toBe(TAX_EXEMPT_CAP);
    expect(high.taxableExcess).toBe(30000);
  });
});

describe("monthsWorkedInYear", () => {
  const dec = new Date(Date.UTC(2026, 11, 20));
  it("counts a full year for someone hired before it", () => {
    expect(monthsWorkedInYear("2024-01-01", null, 2026, dec)).toBe(12);
  });
  it("prorates a mid-year hire", () => {
    // hired Sep 2026 → Sep,Oct,Nov,Dec = 4 months by Dec 20
    expect(monthsWorkedInYear("2026-09-15", null, 2026, dec)).toBe(4);
  });
  it("stops at termination", () => {
    expect(monthsWorkedInYear("2024-01-01", "2026-03-31", 2026, dec)).toBe(3);
  });
  it("returns 0 before hire", () => {
    expect(monthsWorkedInYear("2027-01-01", null, 2026, dec)).toBe(0);
  });
});
