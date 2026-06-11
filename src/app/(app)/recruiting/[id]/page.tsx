import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import type { OpeningKeyword } from "@/lib/ats";
import { OpeningDetail, type ApplicantRow, type OpeningData } from "./opening";

export const dynamic = "force-dynamic";

export default async function OpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: opening } = await supabase
    .from("job_openings")
    .select(`
      id, title, description, status, keywords, created_at,
      org_unit:org_units(name),
      location:locations(name),
      entity:legal_entities(name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!opening) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id, status, score, matched_keywords, missing_keywords, resume_path, resume_filename, created_at,
      candidate:candidates(id, full_name, email)
    `)
    .eq("opening_id", id)
    .order("score", { ascending: false, nullsFirst: false });

  const apps = applications ?? [];
  const appIds = apps.map((a) => a.id);

  const { data: offers } = appIds.length
    ? await supabase
        .from("offers")
        .select("id, application_id, base_amount, currency, frequency, start_date, status, signed_doc_path, signed_filename, sent_at")
        .in("application_id", appIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Latest offer per application (results are newest-first).
  const offerByApp = new Map<string, NonNullable<typeof offers>[number]>();
  for (const o of offers ?? []) {
    if (!offerByApp.has(o.application_id)) offerByApp.set(o.application_id, o);
  }

  const paths = [
    ...apps.map((a) => a.resume_path),
    ...[...offerByApp.values()].map((o) => o.signed_doc_path),
  ].filter((p): p is string => !!p);
  const { data: signed } = paths.length
    ? await supabase.storage.from("resumes").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).filter((s) => !s.error).map((s) => [s.path, s.signedUrl]));

  const keywords = (opening.keywords ?? []) as OpeningKeyword[];
  const requiredTerms = new Set(keywords.filter((k) => k.required).map((k) => k.term));

  const rows: ApplicantRow[] = apps.map((a) => {
    const missing = (a.missing_keywords ?? []) as string[];
    const offer = offerByApp.get(a.id);
    return {
      id: a.id,
      candidateId: a.candidate?.id ?? null,
      name: a.candidate?.full_name ?? "—",
      email: a.candidate?.email ?? "—",
      score: a.score != null ? Number(a.score) : null,
      matched: (a.matched_keywords ?? []) as string[],
      missingRequired: missing.filter((m) => requiredTerms.has(m)),
      status: a.status,
      uploaded: formatDate(a.created_at),
      resumeName: a.resume_filename,
      resumeUrl: a.resume_path ? urlByPath.get(a.resume_path) ?? null : null,
      offer: offer
        ? {
            id: offer.id,
            summary: `${formatMoney(Number(offer.base_amount), offer.currency)} / ${offer.frequency === "annual" ? "yr" : offer.frequency}`,
            startDate: formatDate(offer.start_date),
            status: offer.status,
            signedUrl: offer.signed_doc_path ? urlByPath.get(offer.signed_doc_path) ?? null : null,
          }
        : null,
    };
  });

  const data: OpeningData = {
    id: opening.id,
    title: opening.title,
    description: opening.description,
    status: opening.status,
    dept: opening.org_unit?.name ?? "—",
    location: opening.location?.name ?? "—",
    entity: opening.entity?.name ?? "—",
    keywords,
  };

  return <OpeningDetail opening={data} applicants={rows} />;
}
