import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { annualize, type CompFrequency } from "@/lib/payroll/engine";

/* Offboards a worker: sets last day (offboarding now, terminated when the
   date passes — or immediately if in the past), cancels pending leave,
   revokes software access grants, and notifies HR with the final-pay
   estimate (PTO payout at daily rate). Final pay itself is processed
   through a payroll run. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: membership } = await supabase
    .from("tenant_users").select("tenant_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership || !["owner", "admin", "hr"].includes(membership.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { workerId, lastDay, reason } = await req.json();
  if (!workerId || !lastDay) return NextResponse.json({ error: "workerId and lastDay are required" }, { status: 400 });

  const { data: worker } = await supabase
    .from("workers")
    .select("id, tenant_id, status, person:people(full_name)")
    .eq("id", workerId)
    .maybeSingle();
  if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  if (worker.status === "terminated") return NextResponse.json({ error: "Already terminated" }, { status: 409 });

  const today = new Date().toISOString().slice(0, 10);
  const newStatus = lastDay <= today ? "terminated" : "offboarding";

  // Final-pay estimate: remaining PTO × daily rate from latest comp.
  const [{ data: balance }, { data: comp }] = await Promise.all([
    supabase.from("pto_balances").select("balance").eq("worker_id", workerId).maybeSingle(),
    supabase.from("compensation_records")
      .select("base_amount, currency, frequency")
      .eq("worker_id", workerId)
      .order("effective_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const ptoDays = balance?.balance != null ? Number(balance.balance) : 0;
  const dailyRate = comp?.base_amount != null
    ? annualize(Number(comp.base_amount), (comp.frequency ?? "annual") as CompFrequency) / 260
    : 0;
  const ptoPayout = Math.round(ptoDays * dailyRate * 100) / 100;
  const currency = comp?.currency ?? "USD";

  const { error: updateError } = await supabase
    .from("workers")
    .update({ status: newStatus, terminated_on: lastDay })
    .eq("id", workerId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Cancel anything still pending for them.
  await supabase.from("leave_requests")
    .update({ status: "cancelled" })
    .eq("worker_id", workerId)
    .eq("status", "pending");

  // Revoke software access granted during their hire.
  const { data: applications } = await supabase
    .from("applications").select("candidate_id").eq("hired_worker_id", workerId);
  const candidateIds = (applications ?? []).map((a) => a.candidate_id);
  let revoked = 0;
  if (candidateIds.length) {
    const { data: grants } = await supabase
      .from("access_grants")
      .update({ status: "revoked" })
      .in("candidate_id", candidateIds)
      .eq("status", "provisioned")
      .select("id");
    revoked = grants?.length ?? 0;
  }

  const name = worker.person?.full_name ?? "Employee";
  const { data: admins } = await supabase
    .from("tenant_users").select("user_id").eq("tenant_id", worker.tenant_id).in("role", ["owner", "admin", "hr"]);
  if (admins?.length) {
    await supabase.from("notifications").insert(admins.map((a) => ({
      tenant_id: worker.tenant_id,
      recipient_user_id: a.user_id,
      channel: "in_app",
      payload: {
        kind: "offboarding",
        title: `Offboarding: ${name} — last day ${lastDay}`,
        body: `Reason: ${reason ?? "—"} · Final-pay estimate: ${ptoDays} PTO day(s) ≈ ${ptoPayout.toLocaleString()} ${currency} + prorated salary. Process final pay in the covering payroll run.`,
        link: `/employees/${workerId}`,
      },
      status: "sent",
      sent_at: new Date().toISOString(),
    })));
  }

  return NextResponse.json({ status: newStatus, ptoDays, ptoPayout, currency, revokedGrants: revoked });
}
