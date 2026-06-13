import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { annualize, type CompFrequency } from "@/lib/payroll/engine";
import { monthsWorkedInYear, thirteenthMonth } from "@/lib/payroll/thirteenth";
import { Thirteenth, type ThirteenthRow } from "./thirteenth-client";

export const dynamic = "force-dynamic";

export default async function ThirteenthPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const access = await getAccess();
  if (!access?.isAdmin) redirect("/payroll");

  const supabase = await createClient();
  const now = new Date();
  const { year: yearParam } = await searchParams;
  const year = Number(yearParam) || now.getUTCFullYear();

  // PH employees (13th-month is a PH statutory benefit).
  const { data: workers } = await supabase
    .from("workers")
    .select("id, hired_on, terminated_on, person:people(full_name), entity:legal_entities(country_code, currency)")
    .order("hired_on");

  const phWorkers = (workers ?? []).filter((w) => w.entity?.country_code === "PH");
  const workerIds = phWorkers.map((w) => w.id);

  // Prefer earned basic from processed run history; fall back to proration.
  const [{ data: comps }, { data: items }] = await Promise.all([
    workerIds.length
      ? supabase.from("compensation_records")
          .select("worker_id, base_amount, frequency, effective_date")
          .in("worker_id", workerIds)
          .order("effective_date", { ascending: false })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    workerIds.length
      ? supabase.from("payroll_line_items")
          .select("amount, line:payroll_run_lines(worker_id, run:payroll_runs(status, pay_period:pay_periods(period_start))), pay_code:pay_codes(key)")
          .eq("pay_code.key", "base_salary")
      : Promise.resolve({ data: [] }),
  ]);

  const latestComp = new Map<string, { base: number; freq: string }>();
  for (const c of comps ?? []) {
    if (!latestComp.has(c.worker_id)) latestComp.set(c.worker_id, { base: Number(c.base_amount), freq: c.frequency ?? "annual" });
  }

  const earnedFromRuns = new Map<string, number>();
  for (const it of items ?? []) {
    const line = it.line as { worker_id?: string; run?: { status?: string; pay_period?: { period_start?: string } } } | null;
    if (!line?.worker_id || line.run?.status !== "processed") continue;
    const start = line.run?.pay_period?.period_start;
    if (!start || new Date(start).getUTCFullYear() !== year) continue;
    earnedFromRuns.set(line.worker_id, (earnedFromRuns.get(line.worker_id) ?? 0) + Number(it.amount));
  }

  const rows: ThirteenthRow[] = phWorkers.map((w) => {
    const comp = latestComp.get(w.id);
    const monthlyBasic = comp ? annualize(comp.base, comp.freq as CompFrequency) / 12 : 0;
    const months = monthsWorkedInYear(w.hired_on, w.terminated_on, year, now);
    const fromRuns = earnedFromRuns.get(w.id);
    const earned = fromRuns != null ? fromRuns : monthlyBasic * months;
    const calc = thirteenthMonth(earned);
    return {
      id: w.id,
      name: w.person?.full_name ?? "—",
      currency: w.entity?.currency ?? "PHP",
      monthlyBasic: Math.round(monthlyBasic * 100) / 100,
      months,
      source: fromRuns != null ? "run history" : "prorated",
      earned: Math.round(earned * 100) / 100,
      amount: calc.amount,
      taxExempt: calc.taxExempt,
      taxableExcess: calc.taxableExcess,
    };
  });

  return <Thirteenth rows={rows} year={year} />;
}
