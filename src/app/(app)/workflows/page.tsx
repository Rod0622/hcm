import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Workflows, type DefinitionRow, type RunRow } from "./workflows-client";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const supabase = await createClient();

  const [{ data: runs }, { data: definitions }, { data: workers }] = await Promise.all([
    supabase.from("workflow_runs")
      .select("id, status, current_node, subject_type, subject_id, started_at, definition:workflow_definitions(name)")
      .order("started_at", { ascending: false })
      .limit(50),
    supabase.from("workflow_definitions")
      .select("id, name, trigger_event, status, workflow_versions(count), workflow_runs(count)")
      .order("name"),
    supabase.from("workers").select("id, person:people(full_name)"),
  ]);

  const workerName = new Map((workers ?? []).map((w) => [w.id, w.person?.full_name ?? "—"]));

  const runRows: RunRow[] = (runs ?? []).map((r) => ({
    id: r.id,
    workflow: r.definition?.name ?? "Workflow",
    subject: r.subject_type === "worker" && r.subject_id ? workerName.get(r.subject_id) ?? "—" : (r.subject_type ?? "—"),
    status: r.status,
    step: r.current_node ?? "—",
    started: formatDate(r.started_at),
  }));

  const defRows: DefinitionRow[] = (definitions ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    trigger: d.trigger_event,
    status: d.status,
    versions: d.workflow_versions?.[0]?.count ?? 0,
    runs: d.workflow_runs?.[0]?.count ?? 0,
  }));

  return <Workflows runs={runRows} definitions={defRows} />;
}
