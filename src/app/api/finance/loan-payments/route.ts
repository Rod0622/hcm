import { NextResponse } from "next/server";
import { createFinanceClient, financeConfigured, requireOwner } from "@/lib/finance/db";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/* Toggle a single installment paid/unpaid; the parent loan flips to "paid"
   when its last installment is settled. */
export async function PATCH(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  if (!financeConfigured()) return NextResponse.json({ error: "Finance database not configured — set FINANCE_SUPABASE_SECRET_KEY" }, { status: 503 });

  const { id, paid, paid_date } = await req.json();
  if (!id || typeof paid !== "boolean") return NextResponse.json({ error: "id and paid are required" }, { status: 400 });

  const finance = createFinanceClient();
  const paidDate = paid ? (DATE.test(String(paid_date ?? "")) ? String(paid_date) : new Date().toISOString().slice(0, 10)) : null;
  const { data: payment, error } = await finance
    .from("loan_payments")
    .update({ paid, paid_date: paidDate })
    .eq("id", id)
    .select("loan_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count } = await finance
    .from("loan_payments")
    .select("id", { count: "exact", head: true })
    .eq("loan_id", payment.loan_id)
    .eq("paid", false);
  await finance
    .from("bank_loans")
    .update({ status: (count ?? 0) === 0 ? "paid" : "active" })
    .eq("id", payment.loan_id);

  return NextResponse.json({ ok: true });
}
