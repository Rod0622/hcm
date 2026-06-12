import { describe, expect, it } from "vitest";
import { businessDays } from "../leave";

describe("businessDays", () => {
  it("counts weekdays inclusively", () => {
    // Mon 2026-06-22 → Fri 2026-06-26
    expect(businessDays("2026-06-22", "2026-06-26")).toBe(5);
  });

  it("skips weekends", () => {
    // Fri → Mon spans a weekend
    expect(businessDays("2026-06-19", "2026-06-22")).toBe(2);
  });

  it("skips holidays", () => {
    // PH Independence Day Fri 2026-06-12 inside Mon→Fri week
    expect(businessDays("2026-06-08", "2026-06-12", ["2026-06-12"])).toBe(4);
  });

  it("returns 0 for inverted or invalid ranges", () => {
    expect(businessDays("2026-06-26", "2026-06-22")).toBe(0);
    expect(businessDays("not-a-date", "2026-06-22")).toBe(0);
  });
});
