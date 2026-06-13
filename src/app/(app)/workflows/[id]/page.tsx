import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { RunDetail, type StepRow } from "./run-detail";

export const dynamic = "force-dynamic";

export default async function WorkflowRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("workflow_runs")
    .select("id, status, started_at, finished_at, subject_type, subject_id, definition:workflow_definitions(name)")
    .eq("id", id)
    .maybeSingle();
  if (!run) notFound();

  const [{ data: steps }, { data: tasks }, { data: approvals }, subject] = await Promise.all([
    supabase.from("workflow_run_steps").select("id, node_id, node_type, status, finished_at").eq("run_id", id).order("started_at"),
    supabase.from("tasks").select("run_step_id, title, status, due_on").not("run_step_id", "is", null),
    supabase.from("approvals").select("run_step_id, subject, status").not("run_step_id", "is", null),
    run.subject_type === "worker" && run.subject_id
      ? supabase.from("workers").select("person:people(full_name)").eq("id", run.subject_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const taskByStep = new Map((tasks ?? []).map((t) => [t.run_step_id, t]));
  const apprByStep = new Map((approvals ?? []).map((a) => [a.run_step_id, a]));

  const stepRows: StepRow[] = (steps ?? []).map((s) => {
    const t = taskByStep.get(s.id);
    const a = apprByStep.get(s.id);
    return {
      id: s.id,
      type: s.node_type,
      status: s.status,
      label: t?.title ?? a?.subject ?? s.node_id,
      work: t ? `Task · ${t.status}${t.due_on ? ` · due ${formatDate(t.due_on)}` : ""}` : a ? `Approval · ${a.status}` : "—",
    };
  });

  return (
    <RunDetail
      workflow={run.definition?.name ?? "Workflow"}
      subject={subject?.data?.person?.full_name ?? "—"}
      status={run.status}
      started={formatDate(run.started_at)}
      finished={run.finished_at ? formatDate(run.finished_at) : null}
      steps={stepRows}
    />
  );
}
