import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, relativeTime } from "@/lib/format";
import { CandidateProfile, type AppGrantRow, type CandidateData, type ConvertData, type EmailRow, type HistoryRow } from "./candidate";

export const dynamic = "force-dynamic";

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, tenant_id, full_name, email, phone, source, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!candidate) notFound();

  const [{ data: applications }, { data: emails }, { data: apps }, { data: grants }] = await Promise.all([
    supabase
      .from("applications")
      .select(`
        id, status, score, resume_path, resume_filename, created_at, hired_worker_id,
        opening:job_openings(id, title),
        offers(id, base_amount, currency, frequency, start_date, status, signed_doc_path, signed_filename, sent_at, signed_at)
      `)
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("outbound_emails")
      .select("id, kind, subject, status, error, created_at")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("software_apps").select("id, key, name, category, sso").order("name"),
    supabase.from("access_grants").select("app_id, status, provisioned_at").eq("candidate_id", id),
  ]);

  const allApps = applications ?? [];
  const paths = [
    ...allApps.map((a) => a.resume_path),
    ...allApps.flatMap((a) => a.offers.map((o) => o.signed_doc_path)),
  ].filter((p): p is string => !!p);
  const { data: signedUrls } = paths.length
    ? await supabase.storage.from("resumes").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map((signedUrls ?? []).filter((s) => !s.error).map((s) => [s.path, s.signedUrl]));

  const history: HistoryRow[] = allApps.map((a) => {
    const offer = a.offers.sort((x, y) => (y.sent_at ?? "").localeCompare(x.sent_at ?? ""))[0];
    return {
      id: a.id,
      position: a.opening?.title ?? "—",
      openingId: a.opening?.id ?? null,
      applied: formatDate(a.created_at),
      score: a.score != null ? Number(a.score) : null,
      status: a.status,
      offer: offer
        ? `${formatMoney(Number(offer.base_amount), offer.currency)} / ${offer.frequency === "annual" ? "yr" : offer.frequency} · ${offer.status}`
        : "—",
      resumeUrl: a.resume_path ? urlByPath.get(a.resume_path) ?? null : null,
      signedOfferUrl: offer?.signed_doc_path ? urlByPath.get(offer.signed_doc_path) ?? null : null,
    };
  });

  const emailRows: EmailRow[] = (emails ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    subject: e.subject,
    status: e.status,
    error: e.error,
    when: relativeTime(e.created_at),
  }));

  const grantByApp = new Map((grants ?? []).map((g) => [g.app_id, g]));
  const appRows: AppGrantRow[] = (apps ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category ?? "—",
    sso: a.sso,
    granted: grantByApp.get(a.id)?.status === "provisioned",
  }));

  const hiredApplication = allApps.find((a) => a.status === "hired");

  let convert: ConvertData | null = null;
  if (hiredApplication && !hiredApplication.hired_worker_id) {
    const [{ data: entities }, { data: orgUnits }, { data: locations }, { data: managers }, { count: workerCount }] = await Promise.all([
      supabase.from("legal_entities").select("id, name, country_code, currency").order("name"),
      supabase.from("org_units").select("id, name").order("name"),
      supabase.from("locations").select("id, name").order("name"),
      supabase.from("workers").select("id, person:people(full_name)").in("status", ["active", "onboarding"]),
      supabase.from("workers").select("id", { count: "exact", head: true }),
    ]);
    const signedOffer = hiredApplication.offers.find((o) => o.status === "signed");
    convert = {
      applicationId: hiredApplication.id,
      openingTitle: hiredApplication.opening?.title ?? "",
      offerAmount: signedOffer ? Number(signedOffer.base_amount) : null,
      offerCurrency: signedOffer?.currency ?? "PHP",
      startDate: signedOffer?.start_date ?? new Date().toISOString().slice(0, 10),
      suggestedNumber: `EMP-${String((workerCount ?? 0) + 1).padStart(4, "0")}`,
      entities: (entities ?? []).map((e) => ({ id: e.id, name: e.name, currency: e.currency })),
      orgUnits: (orgUnits ?? []).map((o) => ({ id: o.id, name: o.name })),
      locations: (locations ?? []).map((l) => ({ id: l.id, name: l.name })),
      managers: (managers ?? []).map((m) => ({ id: m.id, name: m.person?.full_name ?? "—" })),
    };
  }

  const data: CandidateData = {
    id: candidate.id,
    tenantId: candidate.tenant_id,
    name: candidate.full_name,
    email: candidate.email ?? "—",
    phone: candidate.phone ?? "—",
    source: candidate.source,
    firstSeen: formatDate(candidate.created_at),
    hired: !!hiredApplication,
    hiredApplicationId: hiredApplication?.id ?? null,
    hiredWorkerId: hiredApplication?.hired_worker_id ?? null,
  };

  return <CandidateProfile candidate={data} history={history} emails={emailRows} apps={appRows} convert={convert} />;
}
