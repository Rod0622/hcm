import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreResume, type OpeningKeyword } from "@/lib/ats";
import { extractResumeText, guessCandidate } from "@/lib/resume";

export const runtime = "nodejs";

/* Accepts one resume per request (the client loops for bulk uploads):
   multipart form with `openingId` and `file`. Extracts text, scores it
   against the opening's keywords, stores the original in the private
   `resumes` bucket, and records candidate + application rows. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await req.formData();
  const openingId = form.get("openingId");
  const file = form.get("file");
  if (typeof openingId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "openingId and file are required" }, { status: 400 });
  }

  const { data: opening } = await supabase
    .from("job_openings")
    .select("id, tenant_id, keywords")
    .eq("id", openingId)
    .maybeSingle();
  if (!opening) return NextResponse.json({ error: "Opening not found" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    text = await extractResumeText(buffer, file.name);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read file" }, { status: 422 });
  }
  if (!text.trim()) {
    return NextResponse.json({ error: "No readable text in file (scanned image PDF?)" }, { status: 422 });
  }

  const result = scoreResume(text, (opening.keywords ?? []) as OpeningKeyword[]);
  const guess = guessCandidate(text, file.name);

  // Reuse the candidate when we've seen this email before in the tenant.
  let candidateId: string | null = null;
  if (guess.email) {
    const { data: existing } = await supabase
      .from("candidates")
      .select("id")
      .eq("tenant_id", opening.tenant_id)
      .ilike("email", guess.email)
      .maybeSingle();
    candidateId = existing?.id ?? null;
  }
  if (!candidateId) {
    const { data: created, error } = await supabase
      .from("candidates")
      .insert({
        tenant_id: opening.tenant_id,
        full_name: guess.name,
        email: guess.email,
        phone: guess.phone,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: `Could not save candidate: ${error.message}` }, { status: 500 });
    candidateId = created.id;
  }

  const applicationId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const path = `${opening.tenant_id}/${opening.id}/${applicationId}/${safeName}`;
  const upload = await supabase.storage
    .from("resumes")
    .upload(path, buffer, { contentType: file.type || "application/octet-stream" });
  if (upload.error) {
    return NextResponse.json({ error: `Could not store resume: ${upload.error.message}` }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("applications").insert({
    id: applicationId,
    tenant_id: opening.tenant_id,
    opening_id: opening.id,
    candidate_id: candidateId,
    score: result.score,
    matched_keywords: result.matched,
    missing_keywords: result.missing,
    resume_path: path,
    resume_filename: file.name,
    resume_text: text.slice(0, 100_000),
    uploaded_by: user.id,
  });
  if (insertError) {
    await supabase.storage.from("resumes").remove([path]);
    return NextResponse.json({ error: `Could not save application: ${insertError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    id: applicationId,
    candidate: guess.name,
    email: guess.email,
    score: result.score,
    matched: result.matched,
    missing: result.missing,
    missingRequired: result.missingRequired,
  });
}
