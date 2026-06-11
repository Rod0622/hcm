import { createClient } from "@/lib/supabase/server";
import { OrgChart, type OrgNode } from "./orgchart-client";

export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  const supabase = await createClient();
  const { data: workers, error } = await supabase
    .from("workers")
    .select(`
      id, manager_worker_id, status,
      person:people(full_name),
      position:positions(title),
      org_unit:org_units(name),
      location:locations(name)
    `)
    .in("status", ["active", "onboarding"])
    .order("hired_on", { ascending: true });

  if (error) throw new Error(`Failed to load org chart: ${error.message}`);

  const nodes: OrgNode[] = workers.map((w) => ({
    id: w.id,
    managerId: w.manager_worker_id,
    name: w.person?.full_name ?? "—",
    title: w.position?.title ?? "—",
    dept: w.org_unit?.name ?? "—",
    location: w.location?.name ?? "—",
    status: w.status,
  }));

  return <OrgChart nodes={nodes} />;
}
