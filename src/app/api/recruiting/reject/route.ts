import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rejectionEmailTemplate, sendCandidateEmail } from "@/lib/email";

/* Rejects the remaining candidates on an opening (everyone not hired, not in
   the offer stage, and not already rejected) and emails each of them that we
   went with another candidate. Optionally limited to specific applications. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { openingId, applicationIds } = await req.json();
  if (!openingId) return NextResponse.json({ error: "openingId is required" }, { status: 400 });

  const { data: opening } = await supabase
    .from("job_openings")
    .select("id, tenant_id, title")
    .eq("id", openingId)
    .maybeSingle();
  if (!opening) return NextResponse.json({ error: "Opening not found" }, { status: 404 });

  let query = supabase
    .from("applications")
    .select("id, status, candidate:candidates(id, full_name, email)")
    .eq("opening_id", opening.id)
    .in("status", ["new", "shortlisted", "interviewing"]);
  if (Array.isArray(applicationIds) && applicationIds.length > 0) {
    query = query.in("id", applicationIds);
  }
  const { data: applications } = await query;

  let rejected = 0;
  let emailed = 0;
  for (const app of applications ?? []) {
    await supabase.from("applications").update({ status: "rejected" }).eq("id", app.id);
    rejected++;
    if (app.candidate?.email) {
      const template = rejectionEmailTemplate({
        candidateName: app.candidate.full_name,
        roleTitle: opening.title,
        company: "Tenkara",
      });
      const result = await sendCandidateEmail(supabase, {
        tenantId: opening.tenant_id,
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

  return NextResponse.json({ rejected, emailed });
}
