import { createFinanceClient, financeConfigured, requireOwner } from "@/lib/finance/db";
import type { LoanPaymentRow, LoanRow } from "@/lib/finance/calc";
import { FinanceLocked, FinanceSetup } from "../shared";
import { Loans } from "./loans-client";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  const access = await requireOwner();
  if (!access) return <FinanceLocked />;
  if (!financeConfigured()) return <FinanceSetup />;

  const finance = createFinanceClient();
  const [{ data: loans }, { data: payments }] = await Promise.all([
    finance.from("bank_loans").select("*").order("loan_date", { ascending: false }).order("created_at", { ascending: false }),
    finance.from("loan_payments").select("*").order("due_date"),
  ]);

  return <Loans loans={(loans ?? []) as LoanRow[]} payments={(payments ?? []) as LoanPaymentRow[]} />;
}
