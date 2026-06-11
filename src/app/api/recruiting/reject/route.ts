import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Requests bulk rejection for an opening's remaining candidates (everyone in
   new/shortlisted/interviewing). No emails are sent here: a pending batch is
   created and owners/admins are notified to approve it — so if the offered
   candidate declines, another applicant can still be picked from the pool
   before the batch goes out. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { openingId } = await req.json();
  if (!openingId) return NextResponse.json({ error: "openingId is required" }, { status: 400 });

  const { data: opening } = await supabase
    .from("job_openings")
    .select("id, tenant_id, title")
    .eq("id", openingId)
    .maybeSingle();
  if (!opening) return NextResponse.json({ error: "Opening not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("rejection_batches")
    .select("id")
    .eq("opening_id", opening.id)
    .eq("status", "pending_approval")
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "A rejection batch is already awaiting approval for this opening" }, { status: 409 });
  }

  const { data: applications } = await supabase
    .from("applications")
    .select("id")
    .eq("opening_id", opening.id)
    .in("status", ["new", "shortlisted", "interviewing"]);
  if (!applications || applications.length === 0) {
    return NextResponse.json({ error: "No remaining candidates to reject" }, { status: 400 });
  }

  const { data: batch, error } = await supabase
    .from("rejection_batches")
    .insert({
      tenant_id: opening.tenant_id,
      opening_id: opening.id,
      application_ids: applications.map((a) => a.id),
      requested_by: user.id,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ batchId: batch.id, pending: applications.length });
}
