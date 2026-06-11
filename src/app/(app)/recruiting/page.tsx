import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { OpeningKeyword } from "@/lib/ats";
import { Openings, type OpeningRow } from "./openings";

export const dynamic = "force-dynamic";

export default async function RecruitingPage() {
  const supabase = await createClient();
  const { data: openings, error } = await supabase
    .from("job_openings")
    .select(`
      id, title, status, headcount, keywords, created_at,
      org_unit:org_units(name),
      location:locations(name),
      applications(count)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load openings: ${error.message}`);

  const rows: OpeningRow[] = openings.map((o) => ({
    id: o.id,
    title: o.title,
    dept: o.org_unit?.name ?? "—",
    location: o.location?.name ?? "—",
    keywords: ((o.keywords ?? []) as OpeningKeyword[]).length,
    applicants: o.applications?.[0]?.count ?? 0,
    status: o.status,
    created: formatDate(o.created_at),
  }));

  return <Openings rows={rows} />;
}
