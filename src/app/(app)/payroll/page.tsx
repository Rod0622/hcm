import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { PayrollAdmin, type PeriodRow, type RunDetail } from "./payroll-admin";
import { MyPayslips, type PayslipRow } from "./my-payslips";

export const dynamic = "force-dynamic";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const access = await getAccess();
  const supabase = await createClient();

  if (!access?.isAdmin) {
    const { data: payslips } = await supabase
      .from("my_payslips")
      .select("*")
      .order("pay_date", { ascending: false });

    const rows: PayslipRow[] = (payslips ?? []).map((p) => ({
      id: p.id!,
      period: `${formatDate(p.period_start)} → ${formatDate(p.period_end)}`,
      payDate: formatDate(p.pay_date),
      payGroup: p.pay_group ?? "—",
      currency: p.currency ?? "USD",
      gross: Number(p.gross ?? 0),
      taxes: Number(p.taxes ?? 0),
      deductions: Number(p.deductions ?? 0),
      net: Number(p.net ?? 0),
      status: p.run_status ?? "—",
    }));

    return <MyPayslips rows={rows} />;
  }

  const { run: runParam } = await searchParams;

  const { data: periods } = await supabase
    .from("pay_periods")
    .select(`
      id, period_start, period_end, pay_date, status,
      pay_group:pay_groups(name, currency),
      runs:payroll_runs(id, status, totals, calculated_at)
    `)
    .order("period_start", { ascending: false });

  const periodRows: PeriodRow[] = (periods ?? []).map((p) => {
    const run = [...p.runs].sort((a, b) => (b.calculated_at ?? "").localeCompare(a.calculated_at ?? ""))[0] ?? null;
    return {
      id: p.id,
      group: p.pay_group?.name ?? "—",
      currency: p.pay_group?.currency ?? "USD",
      label: `${formatDate(p.period_start)} → ${formatDate(p.period_end)}`,
      payDate: formatDate(p.pay_date),
      periodStatus: p.status,
      run: run ? { id: run.id, status: run.status } : null,
    };
  });

  const selectedRunId = runParam ?? periodRows.find((p) => p.run)?.run?.id ?? null;

  let detail: RunDetail | null = null;
  if (selectedRunId) {
    const [{ data: run }, { data: lines }, { data: exceptions }] = await Promise.all([
      supabase.from("payroll_runs")
        .select("id, status, totals, calculated_at, pay_period:pay_periods(period_start, period_end, pay_date, pay_group:pay_groups(name, currency))")
        .eq("id", selectedRunId)
        .maybeSingle(),
      supabase.from("payroll_run_lines")
        .select("id, gross, taxes, deductions, net, currency, notes, worker:workers(person:people(full_name))")
        .eq("run_id", selectedRunId)
        .order("net", { ascending: false }),
      supabase.from("payroll_exceptions")
        .select("id, severity, code, message, suggested_action, status, worker:workers(person:people(full_name))")
        .eq("run_id", selectedRunId)
        .order("severity"),
    ]);

    const lineIds = (lines ?? []).map((l) => l.id);
    const { data: items } = lineIds.length
      ? await supabase
          .from("payroll_line_items")
          .select("line_id, amount, quantity, rate, detail, pay_code:pay_codes(name, kind)")
          .in("line_id", lineIds)
      : { data: [] };
    type LineItemRow = {
      line_id: string;
      amount: number;
      quantity: number | null;
      rate: number | null;
      detail: unknown;
      pay_code: { name: string; kind: string } | null;
    };
    const itemsByLine = new Map<string, LineItemRow[]>();
    for (const it of (items ?? []) as LineItemRow[]) {
      const list = itemsByLine.get(it.line_id) ?? [];
      list.push(it);
      itemsByLine.set(it.line_id, list);
    }

    if (run) {
      const totals = (run.totals ?? {}) as Record<string, number>;
      detail = {
        id: run.id,
        status: run.status,
        group: run.pay_period?.pay_group?.name ?? "—",
        currency: run.pay_period?.pay_group?.currency ?? "USD",
        periodLabel: run.pay_period ? `${formatDate(run.pay_period.period_start)} → ${formatDate(run.pay_period.period_end)}` : "—",
        payDate: run.pay_period ? formatDate(run.pay_period.pay_date) : "—",
        totals: {
          gross: Number(totals.gross ?? 0),
          taxes: Number(totals.taxes ?? 0),
          deductions: Number(totals.deductions ?? 0),
          net: Number(totals.net ?? 0),
          employees: Number(totals.employees ?? 0),
        },
        lines: (lines ?? []).map((l) => ({
          id: l.id,
          name: l.worker?.person?.full_name ?? "—",
          gross: Number(l.gross),
          taxes: Number(l.taxes),
          deductions: Number(l.deductions),
          net: Number(l.net),
          change: ((l.notes ?? {}) as Record<string, string>).change ?? "—",
          items: (itemsByLine.get(l.id) ?? []).map((it) => {
            const detail = (it.detail ?? {}) as Record<string, string>;
            return {
              name: it.pay_code?.name ?? detail.name ?? "—",
              kind: (it.pay_code?.kind ?? detail.kind ?? "earning") as "earning" | "deduction" | "tax",
              amount: Number(it.amount),
              quantity: it.quantity != null ? Number(it.quantity) : null,
              rate: it.rate != null ? Number(it.rate) : null,
            };
          }),
        })),
        exceptions: (exceptions ?? []).map((e) => ({
          id: e.id,
          severity: e.severity,
          message: e.message,
          action: e.suggested_action ?? "—",
          status: e.status,
          who: e.worker?.person?.full_name ?? "—",
        })),
      };
    }
  }

  return <PayrollAdmin periods={periodRows} detail={detail} />;
}
