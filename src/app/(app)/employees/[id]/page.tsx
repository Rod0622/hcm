import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COMP_EVENT, DOCUMENT_STATUS, WORKER_STATUS, formatDate, formatMoney, relativeTime } from "@/lib/format";
import { Profile, type ProfileData } from "./profile";

export const dynamic = "force-dynamic";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select(`
      id, employee_number, status, worker_type, hired_on, work_email, manager_worker_id,
      person:people(full_name),
      position:positions(title, level),
      org_unit:org_units(name),
      entity:legal_entities(name),
      location:locations(name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!worker) notFound();

  const [{ data: manager }, { data: comp }, { data: docs }, { data: activity }] = await Promise.all([
    worker.manager_worker_id
      ? supabase.from("workers").select("person:people(full_name)").eq("id", worker.manager_worker_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("compensation_records")
      .select("effective_date, event, base_amount, currency, frequency, components")
      .eq("worker_id", id)
      .order("effective_date", { ascending: false }),
    supabase.from("documents")
      .select("id, name, kind, status, created_at")
      .eq("worker_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("audit_events")
      .select("actor_label, action, created_at")
      .eq("object_type", "workers")
      .eq("object_id", id)
      .neq("source", "app")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const latest = comp?.[0];
  const components = (latest?.components ?? {}) as Record<string, string>;
  const status = WORKER_STATUS[worker.status] ?? { label: worker.status, tone: "neutral" as const };

  const data: ProfileData = {
    name: worker.person?.full_name ?? "—",
    number: worker.employee_number ?? "—",
    role: worker.position?.title ?? "—",
    level: worker.position?.level ?? components.level ?? "—",
    dept: worker.org_unit?.name ?? "—",
    location: worker.location?.name ?? "—",
    entity: worker.entity?.name ?? "—",
    manager: manager?.person?.full_name ?? "—",
    type: worker.worker_type === "employee" ? "Full-time" : worker.worker_type,
    email: worker.work_email ?? "—",
    start: formatDate(worker.hired_on),
    status: status.label,
    statusTone: status.tone,
    salary: latest?.base_amount != null ? formatMoney(Number(latest.base_amount), latest.currency ?? "USD") : "—",
    salaryHint: latest ? `${latest.currency ?? ""} / ${latest.frequency === "annual" ? "yr" : latest.frequency}` : "",
    equity: components.equity ?? "—",
    compHistory: (comp ?? []).map((c) => ({
      date: formatDate(c.effective_date),
      event: COMP_EVENT[c.event] ?? c.event,
      amount: c.base_amount != null ? formatMoney(Number(c.base_amount), c.currency ?? "USD") : "—",
      by: ((c.components ?? {}) as Record<string, string>).approved_by_label ?? "—",
    })),
    documents: (docs ?? []).map((d) => {
      const ds = DOCUMENT_STATUS[d.status] ?? { label: d.status, tone: "neutral" as const };
      return {
        id: d.id,
        name: d.name,
        kind: d.kind.charAt(0).toUpperCase() + d.kind.slice(1),
        date: formatDate(d.created_at),
        status: ds.label,
        tone: ds.tone,
      };
    }),
    activity: (activity ?? []).map((a) => ({
      when: relativeTime(a.created_at),
      who: a.actor_label,
      what: a.action,
    })),
  };

  return <Profile data={data} />;
}
