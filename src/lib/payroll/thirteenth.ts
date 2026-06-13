/* PH 13th-month pay: total BASIC salary earned in the calendar year ÷ 12.
   Tax-exempt up to ₱90,000 (with other 13th-month/bonus); the excess is
   taxable. Pure and unit-tested; the worksheet feeds it earned-basic per
   employee (from processed run history when available, else prorated from
   the current monthly basic × months worked). */

export const TAX_EXEMPT_CAP = 90000;

export function thirteenthMonth(basicEarnedYtd: number) {
  const amount = Math.round((basicEarnedYtd / 12) * 100) / 100;
  const taxExempt = Math.min(amount, TAX_EXEMPT_CAP);
  const taxableExcess = Math.max(0, Math.round((amount - TAX_EXEMPT_CAP) * 100) / 100);
  return { amount, taxExempt, taxableExcess };
}

/* Whole calendar months an employee was active within [yearStart, periodEnd],
   used for proration when there's no processed payroll history yet. */
export function monthsWorkedInYear(hiredOn: string | null, terminatedOn: string | null, year: number, asOf: Date): number {
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year, 11, 31);
  const periodEnd = Math.min(yearEnd, Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  if (periodEnd < yearStart) return 0;

  const start = Math.max(yearStart, hiredOn ? Date.parse(hiredOn) : yearStart);
  const end = Math.min(periodEnd, terminatedOn ? Date.parse(terminatedOn) : periodEnd);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;

  const s = new Date(start), e = new Date(end);
  return (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1;
}
