import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { formatDate, formatMoney, WORKER_STATUS } from "@/lib/format";
import type { ClockEntry } from "@/components/time-clock";
import { DashboardClient, type AdminData } from "./dashboard-client";

export const dynamic = "force-dynamic";

const RUN_TONE: Record<string, "info" | "danger" | "warning" | "success" | "neutral"> = {
  running: "info",
  blocked: "danger",
  waiting: "warning",
  completed: "success",
  cancelled: "neutral",
  failed: "danger",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const access = await getAccess();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("workers")
    .select("id, tenant_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  let clockEntries: ClockEntry[] = [];
  if (me) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const windowStart = new Date(todayStart.getTime() - 12 * 3600 * 1000).toISOString();
    const { data: entries } = await supabase
      .from("time_entries")
      .select("id, kind, started_at, ended_at")
      .eq("worker_id", me.id)
      .gte("started_at", windowStart)
      .order("started_at", { ascending: true });
    clockEntries = (entries ?? []).map((e) => ({
      id: e.id,
      kind: e.kind,
      startedAt: e.started_at,
      endedAt: e.ended_at,
    }));
  }

  let admin: AdminData | null = null;
  if (access?.isAdmin) {
    const [
      { data: workers },
      { data: latestRun },
      { data: nextPeriod },
      { count: openRoles },
      { count: offerStage },
      { data: compliance },
      { count: payrollBlockers },
      { data: pendingLeave },
      { data: pendingApprovals },
      { data: runs },
    ] = await Promise.all([
      supabase.from("workers")
        .select("id, status, hired_on, org_unit:org_units(name), person:people(full_name)")
        .in("status", ["active", "onboarding"]),
      supabase.from("payroll_runs").select("totals, status").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("pay_periods").select("pay_date").gte("pay_date", new Date().toISOString().slice(0, 10)).order("pay_date").limit(1).maybeSingle(),
      supabase.from("job_openings").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "offer"),
      supabase.from("compliance_statuses")
        .select("status, requirement:compliance_requirements(severity)")
        .in("status", ["pending", "overdue", "in_progress"]),
      supabase.from("payroll_exceptions").select("id", { count: "exact", head: true }).eq("severity", "blocker"),
      supabase.from("leave_requests")
        .select("id, days, leave_type, start_date, end_date, requester:workers!leave_requests_worker_id_fkey(person:people(full_name))")
        .eq("status", "pending"),
      supabase.from("approvals")
        .select("id, subject, kind, worker:workers!approvals_requested_for_worker_id_fkey(person:people(full_name))")
        .eq("status", "pending"),
      supabase.from("workflow_runs")
        .select("id, status, current_node, subject_id, definition:workflow_definitions(name)")
        .order("started_at", { ascending: false })
        .limit(5),
    ]);

    const all = workers ?? [];
    const nameByWorker = new Map(all.map((w) => [w.id, w.person?.full_name ?? "—"]));

    // Trailing 6 months of headcount from hire dates (terminated excluded).
    const series: Array<{ m: string; v: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0));
      series.push({
        m: monthEnd.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        v: all.filter((w) => w.hired_on && new Date(w.hired_on) <= monthEnd).length,
      });
    }
    const hiredThisMonth = all.filter((w) => {
      if (!w.hired_on) return false;
      const d = new Date(w.hired_on);
      return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
    }).length;

    const totals = (latestRun?.totals ?? {}) as Record<string, number>;
    const complianceRows = compliance ?? [];

    admin = {
      headcount: all.length,
      headcountDelta: hiredThisMonth > 0 ? `+${hiredThisMonth}` : undefined,
      netPay: totals.net != null ? formatMoney(Number(totals.net), "USD") : null,
      payEmployees: totals.employees != null ? Number(totals.employees) : null,
      nextPayDate: nextPeriod?.pay_date ? formatDate(nextPeriod.pay_date) : null,
      openRoles: openRoles ?? 0,
      offerStage: offerStage ?? 0,
      complianceDue: complianceRows.length,
      complianceBlockers: complianceRows.filter((c) => c.requirement?.severity === "blocker").length,
      payrollBlockers: payrollBlockers ?? 0,
      headcountSeries: series,
      approvals: [
        ...(pendingLeave ?? []).map((l) => ({
          id: l.id,
          source: "leave" as const,
          who: l.requester?.person?.full_name ?? "—",
          what: `${l.leave_type.toUpperCase()} · ${l.start_date} → ${l.end_date} (${Number(l.days)} day${Number(l.days) === 1 ? "" : "s"})`,
        })),
        ...(pendingApprovals ?? []).map((a) => ({
          id: a.id,
          source: "approval" as const,
          who: a.worker?.person?.full_name ?? "—",
          what: a.subject,
        })),
      ].slice(0, 5),
      workflowRuns: (runs ?? []).map((r) => ({
        id: r.id,
        name: r.definition?.name ?? "Workflow",
        target: r.subject_id ? nameByWorker.get(r.subject_id) ?? "—" : "—",
        step: r.current_node ?? "—",
        status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
        tone: RUN_TONE[r.status] ?? "neutral",
      })),
      startingSoon: all
        .filter((w) => w.status === "onboarding")
        .sort((a, b) => (a.hired_on ?? "").localeCompare(b.hired_on ?? ""))
        .slice(0, 5)
        .map((w) => ({
          id: w.id,
          name: w.person?.full_name ?? "—",
          dept: w.org_unit?.name ?? "—",
          start: formatDate(w.hired_on),
          status: WORKER_STATUS[w.status]?.label ?? w.status,
          tone: WORKER_STATUS[w.status]?.tone ?? "neutral",
        })),
    };
  }

  return (
    <DashboardClient
      displayName={access?.displayName ?? "there"}
      isAdmin={access?.isAdmin ?? false}
      me={me ? { workerId: me.id, tenantId: me.tenant_id } : null}
      clockEntries={clockEntries}
      admin={admin}
    />
  );
}
