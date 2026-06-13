import { createClient } from "@/lib/supabase/server";
import { formatDate, relativeTime } from "@/lib/format";
import { Compliance, type AuditRow, type PackRow, type TaskRow } from "./compliance-client";

export const dynamic = "force-dynamic";

const SEVERITY_TONE: Record<string, "danger" | "warning" | "neutral" | "info"> = {
  blocker: "danger",
  high: "warning",
  low: "neutral",
  scheduled: "info",
};

export default async function CompliancePage() {
  const supabase = await createClient();

  const [{ data: packs }, { data: statuses }, { data: entities }, { data: workers }, { data: audit }] = await Promise.all([
    supabase.from("compliance_packs").select("id, country_code, name, legal_entity_id, status, entity:legal_entities(name)").order("country_code"),
    supabase.from("compliance_statuses")
      .select("id, status, due_on, subject_type, subject_id, requirement:compliance_requirements(name, severity, pack_id), owner:owner_user_id")
      .order("due_on"),
    supabase.from("legal_entities").select("id, name, country_code"),
    supabase.from("workers").select("id, person:people(full_name)"),
    supabase.from("audit_events")
      .select("created_at, actor_label, action, source")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const entityName = new Map((entities ?? []).map((e) => [e.id, e.name]));
  const workerName = new Map((workers ?? []).map((w) => [w.id, w.person?.full_name ?? "—"]));
  const allStatuses = statuses ?? [];

  const packRows: PackRow[] = (packs ?? []).map((p) => {
    const own = allStatuses.filter((s) => s.requirement?.pack_id === p.id);
    const done = own.filter((s) => ["satisfied", "waived"].includes(s.status)).length;
    const next = own
      .filter((s) => !["satisfied", "waived"].includes(s.status) && s.due_on)
      .sort((a, b) => (a.due_on ?? "").localeCompare(b.due_on ?? ""))[0];
    return {
      id: p.id,
      country: p.country_code,
      entity: p.entity?.name ?? "—",
      name: p.name,
      done,
      total: own.length,
      next: next ? `${next.requirement?.name} · ${formatDate(next.due_on)}` : "All current",
    };
  });

  const tasks: TaskRow[] = allStatuses
    .filter((s) => !["satisfied", "waived"].includes(s.status))
    .map((s) => {
      const subject = s.subject_type === "worker" ? workerName.get(s.subject_id) : entityName.get(s.subject_id);
      const sev = s.requirement?.severity ?? "low";
      return {
        id: s.id,
        task: s.requirement?.name ?? "—",
        subject: subject ?? "—",
        due: s.due_on ? formatDate(s.due_on) : "—",
        overdue: s.status === "overdue",
        severity: sev,
        tone: SEVERITY_TONE[sev] ?? "neutral",
        status: s.status,
      };
    });

  const auditRows: AuditRow[] = (audit ?? []).map((a) => ({
    when: relativeTime(a.created_at),
    actor: a.actor_label ?? "system",
    action: a.action,
    source: a.source ?? "app",
  }));

  return <Compliance packs={packRows} tasks={tasks} audit={auditRows} />;
}
