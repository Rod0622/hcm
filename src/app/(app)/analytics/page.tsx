import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Analytics, type AnalyticsData } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const now = new Date();
  const yearStart = `${now.getUTCFullYear()}-01-01`;
  const days14 = new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString();

  const [{ data: workers }, { data: leave }, { data: entries }, { data: runs }, { data: applications }] = await Promise.all([
    supabase.from("workers").select("id, status, hired_on, terminated_on, org_unit:org_units(name), entity:legal_entities(country_code)"),
    supabase.from("leave_requests").select("leave_type, days, start_date, status").eq("status", "approved").gte("start_date", yearStart),
    supabase.from("time_entries").select("kind, started_at, ended_at").gte("started_at", days14),
    supabase.from("payroll_runs")
      .select("status, totals, calculated_at, pay_period:pay_periods(period_start, period_end, pay_date, pay_group:pay_groups(name, currency))")
      .order("calculated_at", { ascending: false })
      .limit(12),
    supabase.from("applications").select("status"),
  ]);

  const all = workers ?? [];
  const active = all.filter((w) => ["active", "onboarding"].includes(w.status));

  // 12-month headcount trend from hire/termination dates.
  const headcountSeries: Array<{ m: string; v: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0));
    headcountSeries.push({
      m: monthEnd.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      v: all.filter((w) =>
        w.hired_on && new Date(w.hired_on) <= monthEnd
        && (!w.terminated_on || new Date(w.terminated_on) > monthEnd)
      ).length,
    });
  }

  const countBy = (items: Array<string>) => {
    const map = new Map<string, number>();
    for (const k of items) map.set(k, (map.get(k) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  };

  // Attendance hours per day (last 14 days).
  const hoursByDay = new Map<string, { work: number; brk: number }>();
  for (const e of entries ?? []) {
    if (!e.ended_at) continue;
    const day = e.started_at.slice(0, 10);
    const hours = (new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 3600000;
    const rec = hoursByDay.get(day) ?? { work: 0, brk: 0 };
    if (e.kind === "work") rec.work += hours;
    else rec.brk += hours;
    hoursByDay.set(day, rec);
  }
  const attendance = [...hoursByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({
      day: day.slice(5),
      work: Math.round(v.work * 10) / 10,
      brk: Math.round(v.brk * 10) / 10,
    }));

  const leaveByType = countByDays(leave ?? []);
  function countByDays(rows: Array<{ leave_type: string; days: number }>) {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.leave_type, (map.get(r.leave_type) ?? 0) + Number(r.days));
    return [...map.entries()].map(([label, days]) => ({ label: label.toUpperCase(), days }));
  }

  const data: AnalyticsData = {
    headcount: active.length,
    departments: new Set(active.map((w) => w.org_unit?.name).filter(Boolean)).size,
    attritionYtd: all.filter((w) => w.terminated_on && w.terminated_on >= yearStart).length,
    hiresYtd: all.filter((w) => w.hired_on && w.hired_on >= yearStart).length,
    headcountSeries,
    deptMix: countBy(active.map((w) => w.org_unit?.name ?? "Unassigned")),
    countryMix: countBy(active.map((w) => w.entity?.country_code ?? "—")),
    leaveByType,
    attendance,
    runs: (runs ?? []).map((r) => {
      const totals = (r.totals ?? {}) as Record<string, number>;
      return {
        group: r.pay_period?.pay_group?.name ?? "—",
        period: r.pay_period ? `${formatDate(r.pay_period.period_start)} → ${formatDate(r.pay_period.period_end)}` : "—",
        currency: r.pay_period?.pay_group?.currency ?? "USD",
        net: Number(totals.net ?? 0),
        employees: Number(totals.employees ?? 0),
        status: r.status,
      };
    }),
    funnel: countBy((applications ?? []).map((a) => a.status)),
  };

  return <Analytics data={data} />;
}
