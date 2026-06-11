import { createClient } from "@/lib/supabase/server";
import { WORKER_STATUS, formatDate } from "@/lib/format";
import { avatarUrl } from "@/lib/avatar";
import { Directory, type DirectoryRow } from "./directory";

export const dynamic = "force-dynamic";

export default async function EmployeeDirectoryPage() {
  const supabase = await createClient();
  const { data: workers, error } = await supabase
    .from("workers")
    .select(`
      id, employee_number, status, hired_on, manager_worker_id,
      person:people(full_name, avatar_path),
      position:positions(title),
      org_unit:org_units(name),
      entity:legal_entities(name),
      location:locations(name)
    `)
    .order("hired_on", { ascending: false });

  if (error) throw new Error(`Failed to load employees: ${error.message}`);

  const nameById = new Map(workers.map((w) => [w.id, w.person?.full_name ?? "—"]));
  const rows: DirectoryRow[] = workers.map((w) => {
    const status = WORKER_STATUS[w.status] ?? { label: w.status, tone: "neutral" as const };
    return {
      id: w.id,
      number: w.employee_number ?? "—",
      name: w.person?.full_name ?? "—",
      avatarSrc: avatarUrl(w.person?.avatar_path) ?? null,
      role: w.position?.title ?? "—",
      dept: w.org_unit?.name ?? "—",
      location: w.location?.name ?? "—",
      entity: w.entity?.name ?? "—",
      manager: w.manager_worker_id ? nameById.get(w.manager_worker_id) ?? "—" : "—",
      start: formatDate(w.hired_on),
      status: status.label,
      tone: status.tone,
    };
  });

  return <Directory rows={rows} />;
}
