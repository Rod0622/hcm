import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { offerEmailTemplate, sendCandidateEmail } from "@/lib/email";

/* Creates a customizable job offer for an application, moves it to the
   'offer' stage, and emails the candidate. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { applicationId, amount, currency, frequency, startDate, notes } = await req.json();
  const base = Number(amount);
  if (!applicationId || !Number.isFinite(base) || base <= 0) {
    return NextResponse.json({ error: "applicationId and a positive amount are required" }, { status: 400 });
  }

  const { data: application } = await supabase
    .from("applications")
    .select(`
      id, tenant_id, status,
      candidate:candidates(id, full_name, email),
      opening:job_openings(id, title)
    `)
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (["hired", "rejected"].includes(application.status)) {
    return NextResponse.json({ error: `Application is already ${application.status}` }, { status: 409 });
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .insert({
      tenant_id: application.tenant_id,
      application_id: application.id,
      base_amount: base,
      currency: currency ?? "USD",
      frequency: frequency ?? "annual",
      start_date: startDate || null,
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (offerError) return NextResponse.json({ error: offerError.message }, { status: 500 });

  await supabase.from("applications").update({ status: "offer" }).eq("id", application.id);

  let email: { status: string; error?: string } = { status: "skipped" };
  if (application.candidate?.email) {
    const template = offerEmailTemplate({
      candidateName: application.candidate.full_name,
      roleTitle: application.opening?.title ?? "the role",
      company: "Tenkara",
      amount: base,
      currency: currency ?? "USD",
      frequency: frequency ?? "annual",
      startDate: startDate || null,
      notes: notes?.trim() || null,
    });
    email = await sendCandidateEmail(supabase, {
      tenantId: application.tenant_id,
      applicationId: application.id,
      candidateId: application.candidate.id,
      kind: "offer",
      toEmail: application.candidate.email,
      toName: application.candidate.full_name,
      subject: template.subject,
      body: template.body,
      userId: user.id,
    });
  }

  return NextResponse.json({ offerId: offer.id, email });
}
