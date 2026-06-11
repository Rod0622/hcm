import type { BadgeTone } from "@/components/ui";

/* Weekdays between two ISO dates, inclusive. */
export function businessDays(start: string, end: string): number {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  let count = 0;
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export const LEAVE_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const LEAVE_TYPE: Record<string, string> = {
  pto: "PTO",
  sick: "Sick leave",
  unpaid: "Unpaid leave",
};
