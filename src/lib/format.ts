import type { BadgeTone } from "@/components/ui";

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const WORKER_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  onboarding: { label: "Onboarding", tone: "info" },
  active: { label: "Active", tone: "success" },
  on_leave: { label: "On leave", tone: "warning" },
  offboarding: { label: "Offboarding", tone: "warning" },
  terminated: { label: "Terminated", tone: "neutral" },
};

export const DOCUMENT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "warning" },
  sent: { label: "Awaiting signature", tone: "warning" },
  signed: { label: "Signed", tone: "success" },
  verified: { label: "Verified", tone: "success" },
  filed: { label: "Filed", tone: "success" },
  expired: { label: "Expired", tone: "danger" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const COMP_EVENT: Record<string, string> = {
  hire: "Hire",
  merit: "Merit",
  promotion: "Promotion",
  adjustment: "Adjustment",
  equity_grant: "Equity grant",
  demotion: "Demotion",
  correction: "Correction",
};
