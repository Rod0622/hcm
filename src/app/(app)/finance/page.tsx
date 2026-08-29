import { createFinanceClient, financeConfigured, requireOwner } from "@/lib/finance/db";
import type { InvestmentRow, LoanPaymentRow, LoanRow, PersonRow } from "@/lib/finance/calc";
import { FinanceLocked, FinanceSetup } from "./shared";
import { FinanceOverview } from "./overview-client";

export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage() {
  const access = await requireOwner();
  if (!access) return <FinanceLocked />;
  if (!financeConfigured()) return <FinanceSetup />;

  const finance = createFinanceClient();
  const [{ data: people }, { data: investments }, { data: loans }, { data: payments }] = await Promise.all([
    finance.from("people").select("id, name, is_me, notes").order("name"),
    finance.from("investments").select("*").order("maturity_date"),
    finance.from("bank_loans").select("*").order("loan_date", { ascending: false }),
    finance.from("loan_payments").select("*").order("due_date"),
  ]);

  return (
    <FinanceOverview
      people={(people ?? []) as PersonRow[]}
      investments={(investments ?? []) as InvestmentRow[]}
      loans={(loans ?? []) as LoanRow[]}
      payments={(payments ?? []) as LoanPaymentRow[]}
    />
  );
}
