import { createFinanceClient, financeConfigured, requireOwner } from "@/lib/finance/db";
import type { InvestmentRow, PersonRow } from "@/lib/finance/calc";
import { FinanceLocked, FinanceSetup } from "../shared";
import { Investments } from "./investments-client";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const access = await requireOwner();
  if (!access) return <FinanceLocked />;
  if (!financeConfigured()) return <FinanceSetup />;

  const finance = createFinanceClient();
  const [{ data: people }, { data: investments }] = await Promise.all([
    finance.from("people").select("id, name, is_me, notes").order("name"),
    finance.from("investments").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  return <Investments people={(people ?? []) as PersonRow[]} investments={(investments ?? []) as InvestmentRow[]} />;
}
