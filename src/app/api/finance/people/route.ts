import { NextResponse } from "next/server";
import { createFinanceClient, financeConfigured, requireOwner } from "@/lib/finance/db";

async function guard() {
  if (!(await requireOwner())) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  if (!financeConfigured()) return NextResponse.json({ error: "Finance database not configured — set FINANCE_SUPABASE_SECRET_KEY" }, { status: 503 });
  return null;
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const { name, notes } = await req.json();
  if (!name || !String(name).trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const finance = createFinanceClient();
  const { data, error } = await finance
    .from("people")
    .insert({ name: String(name).trim(), notes: String(notes ?? "").trim() })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const { id, name, notes } = await req.json();
  if (!id || !name || !String(name).trim()) return NextResponse.json({ error: "id and name are required" }, { status: 400 });

  const finance = createFinanceClient();
  const { error } = await finance
    .from("people")
    .update({ name: String(name).trim(), notes: String(notes ?? "").trim() })
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
  const { data: me } = await finance.from("people").select("is_me").eq("id", id).maybeSingle();
  if (me?.is_me) return NextResponse.json({ error: "The own-capital entry cannot be deleted" }, { status: 400 });

  const { error } = await finance.from("people").delete().eq("id", id);
  if (error) {
    const friendly = error.code === "23503"
      ? "This person still has investments or referrals recorded — delete those first."
      : error.message;
    return NextResponse.json({ error: friendly }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
