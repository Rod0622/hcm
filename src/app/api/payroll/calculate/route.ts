import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateLine, type Frequency, type PayException, type PayLine, type WorkerPayInput } from "@/lib/payroll/engine";
import { businessDays } from "@/lib/leave";

export const runtime = "nodejs";

/* Calculates (or recalculates) the draft payroll run for a pay period:
   base from the latest compensation record, OT at 1.25x from clocked time
   beyond 8h/day, unpaid leave deducted, country statutory items, and
   exceptions for anything that needs review. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: membership } = await supabase
    .from("tenant_users").select("tenant_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership || !["owner", "admin", "hr", "finance"].includes(membership.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { periodId } = await req.json();
  const { data: period } = await supabase
    .from("pay_periods")
    .select("id, tenant_id, period_start, period_end, pay_date, status, pay_group:pay_groups(id, name, frequency, currency, legal_entity_id, entity:legal_entities(country_code))")
    .eq("id", periodId)
    .maybeSingle();
  if (!period || !period.pay_group) return NextResponse.json({ error: "Pay period not found" }, { status: 404 });
  if (period.status !== "open") return NextResponse.json({ error: `Period is ${period.status}` }, { status: 409 });

  const { data: existingRuns } = await supabase
    .from("payroll_runs").select("id, status").eq("pay_period_id", period.id);
  if ((existingRuns ?? []).some((r) => !["draft", "cancelled"].includes(r.status))) {
    return NextResponse.json({ error: "A run for this period is already in review or beyond" }, { status: 409 });
  }
  for (const r of existingRuns ?? []) {
    await supabase.from("payroll_runs").delete().eq("id", r.id);
  }

  const group = period.pay_group;
  const country = group.entity?.country_code ?? "US";
  const frequency = group.frequency as Frequency;
  const periodEndExclusive = new Date(new Date(period.period_end + "T00:00:00Z").getTime() + 24 * 3600 * 1000).toISOString();

  const [{ data: workers }, { data: holidays }, { data: payCodes }] = await Promise.all([
    supabase.from("workers")
      .select("id, hired_on, person:people(full_name)")
      .eq("legal_entity_id", group.legal_entity_id)
      .in("status", ["active", "onboarding"])
      .lte("hired_on", period.period_end),
    supabase.from("holidays").select("holiday_date").eq("country_code", country)
      .gte("holiday_date", period.period_start).lte("holiday_date", period.period_end),
    supabase.from("pay_codes").select("id, key"),
  ]);
  const workerIds = (workers ?? []).map((w) => w.id);
  if (workerIds.length === 0) return NextResponse.json({ error: "No employees in this pay group's entity" }, { status: 400 });

  const [{ data: comps }, { data: entries }, { data: unpaidLeave }] = await Promise.all([
    supabase.from("compensation_records")
      .select("worker_id, base_amount, effective_date")
      .in("worker_id", workerIds)
      .lte("effective_date", period.period_end)
      .order("effective_date", { ascending: false }),
    supabase.from("time_entries")
      .select("worker_id, kind, started_at, ended_at")
      .in("worker_id", workerIds)
      .eq("kind", "work")
      .gte("started_at", period.period_start)
      .lt("started_at", periodEndExclusive),
    supabase.from("leave_requests")
      .select("worker_id, start_date, end_date")
      .in("worker_id", workerIds)
      .eq("leave_type", "unpaid")
      .eq("status", "approved")
      .lte("start_date", period.period_end)
      .gte("end_date", period.period_start),
  ]);

  const baseByWorker = new Map<string, number>();
  for (const c of comps ?? []) {
    if (!baseByWorker.has(c.worker_id)) baseByWorker.set(c.worker_id, Number(c.base_amount));
  }

  // Overtime: clocked work minutes beyond 8h per UTC day.
  const minutesByWorkerDay = new Map<string, number>();
  for (const e of entries ?? []) {
    if (!e.ended_at) continue;
    const mins = (new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 60000;
    const key = `${e.worker_id}:${e.started_at.slice(0, 10)}`;
    minutesByWorkerDay.set(key, (minutesByWorkerDay.get(key) ?? 0) + mins);
  }
  const otByWorker = new Map<string, number>();
  for (const [key, mins] of minutesByWorkerDay) {
    const workerId = key.split(":")[0];
    if (mins > 480) otByWorker.set(workerId, (otByWorker.get(workerId) ?? 0) + (mins - 480));
  }

  const holidayDates = (holidays ?? []).map((h) => h.holiday_date);
  const unpaidByWorker = new Map<string, number>();
  for (const l of unpaidLeave ?? []) {
    const start = l.start_date < period.period_start ? period.period_start : l.start_date;
    const end = l.end_date > period.period_end ? period.period_end : l.end_date;
    const days = businessDays(start, end, holidayDates);
    unpaidByWorker.set(l.worker_id, (unpaidByWorker.get(l.worker_id) ?? 0) + days);
  }

  const results = (workers ?? []).map((w) => {
    const input: WorkerPayInput = {
      workerId: w.id,
      name: w.person?.full_name ?? "—",
      country,
      annualBase: baseByWorker.get(w.id) ?? null,
      otMinutes: otByWorker.get(w.id) ?? 0,
      unpaidLeaveDays: unpaidByWorker.get(w.id) ?? 0,
      newHire: !!w.hired_on && w.hired_on >= period.period_start,
    };
    return calculateLine(input, frequency);
  });

  const lines = results.filter((r): r is PayLine => !("excluded" in r));
  const excluded = results.filter((r): r is { excluded: true; exception: PayException; workerId: string } => "excluded" in r);
  const totals = {
    gross: Math.round(lines.reduce((s, l) => s + l.gross, 0) * 100) / 100,
    taxes: Math.round(lines.reduce((s, l) => s + l.taxes, 0) * 100) / 100,
    deductions: Math.round(lines.reduce((s, l) => s + l.deductions, 0) * 100) / 100,
    net: Math.round(lines.reduce((s, l) => s + l.net, 0) * 100) / 100,
    employees: lines.length,
  };

  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .insert({
      tenant_id: period.tenant_id,
      pay_group_id: group.id,
      pay_period_id: period.id,
      status: "draft",
      totals,
      calculated_at: new Date().toISOString(),
      submitted_by: user.id,
    })
    .select("id")
    .single();
  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });

  const codeByKey = new Map((payCodes ?? []).map((c) => [c.key, c.id]));
  for (const line of lines) {
    const { data: inserted, error: lineError } = await supabase
      .from("payroll_run_lines")
      .insert({
        tenant_id: period.tenant_id,
        run_id: run.id,
        worker_id: line.workerId,
        currency: group.currency,
        gross: line.gross,
        taxes: line.taxes,
        deductions: line.deductions,
        net: line.net,
        notes: line.note ? { change: line.note } : {},
      })
      .select("id")
      .single();
    if (lineError || !inserted) continue;
    const items = line.items
      .filter((it) => codeByKey.has(it.code))
      .map((it) => ({
        tenant_id: period.tenant_id,
        line_id: inserted.id,
        pay_code_id: codeByKey.get(it.code)!,
        amount: it.amount,
        quantity: it.quantity ?? null,
        rate: it.rate ?? null,
        detail: { name: it.name, kind: it.kind },
      }));
    if (items.length) await supabase.from("payroll_line_items").insert(items);
  }

  const exceptions = [
    ...lines.flatMap((l) => l.exceptions.map((e) => ({ ...e, workerId: l.workerId }))),
    ...excluded.map((r) => ({ ...r.exception, workerId: r.workerId })),
  ];
  if (exceptions.length) {
    await supabase.from("payroll_exceptions").insert(exceptions.map((e) => ({
      tenant_id: period.tenant_id,
      run_id: run.id,
      worker_id: e.workerId,
      severity: e.severity,
      code: e.code,
      message: e.message,
      suggested_action: e.action,
    })));
  }

  return NextResponse.json({ runId: run.id, ...totals, exceptions: exceptions.length, excluded: excluded.length });
}
