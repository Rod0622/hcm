import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TRANSITIONS: Record<string, { from: string; to: string }> = {
  submit: { from: "draft", to: "in_review" },
  approve: { from: "in_review", to: "approved" },
  process: { from: "approved", to: "processed" },
};

/* Moves a payroll run through draft → in_review → approved → processed.
   Approval is blocked while open blocker exceptions remain; processing
   marks the pay period paid. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: membership } = await supabase
    .from("tenant_users").select("role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership || !["owner", "admin", "hr", "finance"].includes(membership.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { runId, action } = await req.json();
  const transition = TRANSITIONS[action];
  if (!runId || !transition) return NextResponse.json({ error: "runId and a valid action are required" }, { status: 400 });

  const { data: run } = await supabase
    .from("payroll_runs").select("id, status, pay_period_id").eq("id", runId).maybeSingle();
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (run.status !== transition.from) {
    return NextResponse.json({ error: `Run is ${run.status}; ${action} requires ${transition.from}` }, { status: 409 });
  }

  if (action === "approve") {
    const { count } = await supabase
      .from("payroll_exceptions")
      .select("id", { count: "exact", head: true })
      .eq("run_id", run.id)
      .eq("severity", "blocker")
      .eq("status", "open");
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: `${count} open blocker exception(s) must be resolved or waived first` }, { status: 409 });
    }
  }

  const update: { status: string; approved_by?: string; processed_at?: string } = { status: transition.to };
  if (action === "approve") update.approved_by = user.id;
  if (action === "process") update.processed_at = new Date().toISOString();
  const { error } = await supabase.from("payroll_runs").update(update).eq("id", run.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === "process") {
    await supabase.from("pay_periods").update({ status: "paid" }).eq("id", run.pay_period_id);
  }

  return NextResponse.json({ status: transition.to });
}
