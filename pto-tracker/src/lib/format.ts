import { parseISO } from "@/lib/pto";

export function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—";
  return parseISO(iso.slice(0, 10)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

export function fmtRange(start: string, end: string) {
  return start === end ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`;
}

export function fmtCredits(n: number) {
  return Number(n).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export const TYPE_LABELS: Record<string, string> = {
  pto: "Paid time off",
  unpaid: "Leave without pay",
  offset: "Offset day",
};

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  denied: "bg-rose-50 text-rose-700 ring-rose-600/20",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-500/20",
};
