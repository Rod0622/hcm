import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/* Uploads the candidate's signed offer letter: stores it in the private
   resumes bucket under {tenant}/offers/, marks the offer signed, and moves
   the application to 'hired' (next stage: access provisioning). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await req.formData();
  const offerId = form.get("offerId");
  const file = form.get("file");
  if (typeof offerId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "offerId and file are required" }, { status: 400 });
  }

  const { data: offer } = await supabase
    .from("offers")
    .select("id, tenant_id, application_id, status")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.status !== "sent") {
    return NextResponse.json({ error: `Offer is ${offer.status}, expected an outstanding (sent) offer` }, { status: 409 });
  }

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const path = `${offer.tenant_id}/offers/${offer.id}/${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await supabase.storage
    .from("resumes")
    .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
  if (upload.error) {
    return NextResponse.json({ error: `Could not store signed offer: ${upload.error.message}` }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("offers")
    .update({ status: "signed", signed_at: new Date().toISOString(), signed_doc_path: path, signed_filename: file.name })
    .eq("id", offer.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await supabase.from("applications").update({ status: "hired" }).eq("id", offer.application_id);

  return NextResponse.json({ ok: true });
}
