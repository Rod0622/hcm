import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rejectionEmailTemplate, sendCandidateEmail } from "@/lib/email";

/* Owner/admin decision on a pending rejection batch. Approving executes it:
   candidates still in play are marked rejected and emailed; anyone who moved
   to the offer stage (or was hired) since the request is skipped. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { batchId, decision } = await req.json();
  if (!batchId || !["approve", "cancel"].includes(decision)) {
    return NextResponse.json({ error: "batchId and decision (approve|cancel) are required" }, { status: 400 });
  }

  const { data: batch } = await supabase
    .from("rejection_batches")
    .select("id, tenant_id, opening_id, application_ids, status")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.status !== "pending_approval") {
    return NextResponse.json({ error: `Batch is already ${batch.status}` }, { status: 409 });
  }

  const { data: membership } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", batch.tenant_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only an owner or admin can decide rejection batches" }, { status: 403 });
  }

  if (decision === "cancel") {
    await supabase
      .from("rejection_batches")
      .update({ status: "cancelled", decided_by: user.id, decided_at: new Date().toISOString() })
      .eq("id", batch.id);
    return NextResponse.json({ cancelled: true });
  }

  const { data: opening } = await supabase
    .from("job_openings")
    .select("title")
    .eq("id", batch.opening_id)
    .maybeSingle();

  // Re-check eligibility at execution time: skip anyone now in offer/hired.
  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, candidate:candidates(id, full_name, email)")
    .in("id", batch.application_ids)
    .in("status", ["new", "shortlisted", "interviewing"]);

  let rejected = 0;
  let emailed = 0;
  for (const app of applications ?? []) {
    await supabase.from("applications").update({ status: "rejected" }).eq("id", app.id);
    rejected++;
    if (app.candidate?.email) {
      const template = rejectionEmailTemplate({
        candidateName: app.candidate.full_name,
        roleTitle: opening?.title ?? "the role",
        company: "Tenkara",
      });
      const result = await sendCandidateEmail(supabase, {
        tenantId: batch.tenant_id,
        applicationId: app.id,
        candidateId: app.candidate.id,
        kind: "rejection",
        toEmail: app.candidate.email,
        toName: app.candidate.full_name,
        subject: template.subject,
        body: template.body,
        userId: user.id,
      });
      if (result.status !== "failed") emailed++;
    }
  }

  await supabase
    .from("rejection_batches")
    .update({ status: "approved", decided_by: user.id, decided_at: new Date().toISOString() })
    .eq("id", batch.id);

  const skipped = batch.application_ids.length - rejected;
  return NextResponse.json({ rejected, emailed, skipped });
}
