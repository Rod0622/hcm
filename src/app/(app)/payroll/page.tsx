import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { PayrollAdmin } from "./payroll-admin";
import { MyPayslips, type PayslipRow } from "./my-payslips";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const access = await getAccess();

  if (access?.isAdmin) {
    return <PayrollAdmin />;
  }

  const supabase = await createClient();
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
