import { NextResponse } from "next/server";
import { createFinanceClient, financeConfigured, requireOwner } from "@/lib/finance/db";

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

/* Builds the row from the request body; returns an error string when the
   required pieces are missing or malformed. Rates are informational (%),
   amounts are authoritative pesos. */
function parseInvestment(body: Record<string, unknown>) {
  const principal = money(body.principal);
  const interestAmount = money(body.interest_amount) ?? 0;
  const businessReturn = money(body.business_return_amount) ?? 0;
  const referrerCut = money(body.referrer_cut_amount) ?? 0;
  if (!body.financer_id) return { error: "Pick a financer" };
  if (!principal || principal <= 0) return { error: "Amount invested must be greater than zero" };
  if (interestAmount < 0 || referrerCut < 0) return { error: "Interest and referral cut cannot be negative" };
  if (!DATE.test(String(body.transaction_date ?? "")) || !DATE.test(String(body.maturity_date ?? ""))) {
    return { error: "Transaction and payout dates are required" };
  }
  if (String(body.maturity_date) < String(body.transaction_date)) {
    return { error: "Payout date cannot be before the transaction date" };
  }
  const referrerId = body.referrer_id ? String(body.referrer_id) : null;
  if (referrerId && referrerId === String(body.financer_id)) {
    return { error: "The referrer cannot be the financer themselves" };
  }
  return {
    row: {
      transaction_date: String(body.transaction_date),
      financer_id: String(body.financer_id),
      principal,
      interest_rate: money(body.interest_rate),
      interest_amount: interestAmount,
      maturity_date: String(body.maturity_date),
      business_return_rate: money(body.business_return_rate),
      business_return_amount: businessReturn,
      referrer_id: referrerId,
      referrer_cut_rate: referrerId ? money(body.referrer_cut_rate) : null,
      referrer_cut_amount: referrerId ? referrerCut : 0,
      notes: String(body.notes ?? "").trim(),
    },
  };
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = parseInvestment(await req.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const finance = createFinanceClient();
  const { data, error } = await finance.from("investments").insert(parsed.row).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const finance = createFinanceClient();

  /* Settle (cheque received, financer + referrer paid) or reopen. */
  if (body.action === "settle" || body.action === "reopen") {
    const settled = body.action === "settle";
    const paidDate = settled ? (DATE.test(String(body.paid_date ?? "")) ? String(body.paid_date) : new Date().toISOString().slice(0, 10)) : null;
    const { error } = await finance
      .from("investments")
      .update({ status: settled ? "paid" : "active", paid_date: paidDate })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const parsed = parseInvestment(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { error } = await finance.from("investments").update(parsed.row).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const finance = createFinanceClient();
  const { error } = await finance.from("investments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
