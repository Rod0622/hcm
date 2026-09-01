/* PTO math shared by server and client. All dates are YYYY-MM-DD strings
   handled at UTC midnight so results don't drift with the viewer's TZ.
   Mirrors the SQL functions in supabase/migrations — keep both in sync. */

import type { AppSettings } from "./supabase/types";

export const DEFAULT_SETTINGS: Pick<
  AppSettings,
  "cutoff_anchor" | "cutoff_days" | "hours_per_cutoff" | "pay_delay_days" | "monthly_accrual"
> = {
  cutoff_anchor: "2026-08-23",
  cutoff_days: 14,
  hours_per_cutoff: 80,
  pay_delay_days: 6,
  monthly_accrual: 0.5,
};

export function parseISO(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

export function isWeekend(iso: string): boolean {
  const dow = parseISO(iso).getUTCDay();
  return dow === 0 || dow === 6;
}

/* Weekdays (Mon–Fri) between two dates, inclusive. */
export function businessDays(start: string, end: string): number {
  if (end < start) return 0;
  let count = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!isWeekend(d)) count += 1;
  }
  return count;
}

/* Credits accrued to date: monthly_accrual per completed month since hire
   (each monthly anniversary earns another 0.5). */
export function accruedCredits(
  dateHired: string | null,
  asOf: string = todayISO(),
  monthlyAccrual: number = DEFAULT_SETTINGS.monthly_accrual
): number {
  if (!dateHired || dateHired > asOf) return 0;
  const hired = parseISO(dateHired);
  const now = parseISO(asOf);
  let months =
    (now.getUTCFullYear() - hired.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - hired.getUTCMonth());
  if (now.getUTCDate() < hired.getUTCDate()) months -= 1;
  return Math.max(0, months) * monthlyAccrual;
}

export type Cutoff = { start: string; end: string; payday: string; index: number };

/* The bi-weekly payroll cutoff containing `date`, derived from the anchor
   cutoff start (e.g. Aug 23 → Sep 5, paid Sep 11). */
export function cutoffFor(
  date: string,
  settings: {
    cutoff_anchor: string;
    cutoff_days: number;
    pay_delay_days: number;
  } = DEFAULT_SETTINGS
): Cutoff {
  const anchor = parseISO(settings.cutoff_anchor);
  const target = parseISO(date);
  const diffDays = Math.floor((target.getTime() - anchor.getTime()) / 86_400_000);
  const index = Math.floor(diffDays / settings.cutoff_days);
  const start = addDays(settings.cutoff_anchor, index * settings.cutoff_days);
  const end = addDays(start, settings.cutoff_days - 1);
  const payday = addDays(end, settings.pay_delay_days);
  return { start, end, payday, index };
}

export function sameCutoff(
  a: string,
  b: string,
  settings: { cutoff_anchor: string; cutoff_days: number; pay_delay_days: number } = DEFAULT_SETTINGS
): boolean {
  return cutoffFor(a, settings).index === cutoffFor(b, settings).index;
}
