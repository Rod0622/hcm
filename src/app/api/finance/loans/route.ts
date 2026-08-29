import { NextResponse } from "next/server";
import { createFinanceClient, financeConfigured, requireOwner } from "@/lib/finance/db";
import { buildLoanSchedule } from "@/lib/finance/calc";

async function guard() {
  if (!(await requireOwner())) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  if (!financeConfigured()) return NextResponse.json({ error: "Finance database not configured — set FINANCE_SUPABASE_SECRET_KEY" }, { status: 503 });
  return null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function money(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json();

  const principal = money(body.principal);
  const interestAmount = money(body.interest_amount) ?? 0;
  const termMonths = Number(body.term_months);
  const repayment = body.repayment === "monthly" ? "monthly" : "lump_sum";
  if (!body.bank_name || !String(body.bank_name).trim()) return NextResponse.json({ error: "Bank name is required" }, { status: 400 });
  if (!principal || principal <= 0) return NextResponse.json({ error: "Loan amount must be greater than zero" }, { status: 400 });
  if (interestAmount < 0) return NextResponse.json({ error: "Interest cannot be negative" }, { status: 400 });
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 120) return NextResponse.json({ error: "Term must be 1–120 months" }, { status: 400 });
  if (!DATE.test(String(body.loan_date ?? ""))) return NextResponse.json({ error: "Loan date is required" }, { status: 400 });

  const finance = createFinanceClient();
  const { data: loan, error } = await finance
    .from("bank_loans")
    .insert({
      bank_name: String(body.bank_name).trim(),
      loan_date: String(body.loan_date),
      principal,
      interest_rate: money(body.interest_rate),
      interest_amount: interestAmount,
      term_months: termMonths,
      repayment,
      notes: String(body.notes ?? "").trim(),
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const schedule = buildLoanSchedule(String(body.loan_date), principal, interestAmount, termMonths, repayment)
    .map((p) => ({ ...p, loan_id: loan.id }));
  const { error: scheduleError } = await finance.from("loan_payments").insert(schedule);
  if (scheduleError) {
    await finance.from("bank_loans").delete().eq("id", loan.id);
    return NextResponse.json({ error: scheduleError.message }, { status: 500 });
  }
  return NextResponse.json({ id: loan.id });
}

export async function PATCH(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const { id, bank_name, notes } = await req.json();
  if (!id || !bank_name || !String(bank_name).trim()) return NextResponse.json({ error: "id and bank name are required" }, { status: 400 });

  const finance = createFinanceClient();
  const { error } = await finance
    .from("bank_loans")
    .update({ bank_name: String(bank_name).trim(), notes: String(notes ?? "").trim() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const finance = createFinanceClient();
  const { error } = await finance.from("bank_loans").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
