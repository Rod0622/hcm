import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { avatarUrl } from "@/lib/avatar";
import { COMP_EVENT, DOCUMENT_STATUS, FREQ_LABEL, WORKER_STATUS, formatDate, formatMoney, relativeTime } from "@/lib/format";
import { annualize, type CompFrequency } from "@/lib/payroll/engine";
import { Profile, type EditData, type ProfileData } from "./profile";

export const dynamic = "force-dynamic";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getAccess();

  const { data: worker } = await supabase
    .from("workers")
    .select(`
      id, tenant_id, employee_number, status, worker_type, hired_on, work_email,
      manager_worker_id, org_unit_id, position_id, location_id, user_id,
      person:people(id, full_name, phone, avatar_path),
      position:positions(title, level),
      org_unit:org_units(name),
      entity:legal_entities(name),
      location:locations(name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!worker) notFound();

  const [{ data: manager }, { data: comp }, { data: docs }, { data: activity }, { data: locations }, { data: balance }] = await Promise.all([
    worker.manager_worker_id
      ? supabase.from("workers").select("person:people(full_name)").eq("id", worker.manager_worker_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("compensation_records")
      .select("effective_date, event, base_amount, currency, frequency, taxable, apply_statutory, components")
      .eq("worker_id", id)
      .order("effective_date", { ascending: false })
      .order("created_at", { ascending: false }),
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
    supabase.from("locations").select("id, name").order("name"),
    supabase.from("pto_balances").select("balance").eq("worker_id", id).maybeSingle(),
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
    phone: worker.person?.phone ?? "—",
    avatarSrc: avatarUrl(worker.person?.avatar_path) ?? null,
    start: formatDate(worker.hired_on),
    status: status.label,
    statusTone: status.tone,
    salary: latest?.base_amount != null ? formatMoney(Number(latest.base_amount), latest.currency ?? "USD") : "—",
    salaryHint: latest
      ? [
          `${latest.currency ?? ""} / ${FREQ_LABEL[latest.frequency ?? "annual"] ?? latest.frequency}`,
          latest.taxable === false ? "tax-exempt" : null,
          latest.apply_statutory === false ? "no statutory" : null,
        ].filter(Boolean).join(" · ")
      : "",
    equity: components.equity ?? "—",
    compHistory: (comp ?? []).map((c) => ({
      date: formatDate(c.effective_date),
      event: COMP_EVENT[c.event] ?? c.event,
      amount: c.base_amount != null
        ? `${formatMoney(Number(c.base_amount), c.currency ?? "USD")} / ${FREQ_LABEL[c.frequency ?? "annual"] ?? c.frequency}`
        : "—",
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

  const edit: EditData = {
    workerId: worker.id,
    personId: worker.person?.id ?? "",
    tenantId: worker.tenant_id,
    orgUnitId: worker.org_unit_id,
    locationId: worker.location_id,
    name: worker.person?.full_name ?? "",
    phone: worker.person?.phone ?? "",
    title: worker.position?.title ?? "",
    level: worker.position?.level ?? "",
    salary: latest?.base_amount != null ? Number(latest.base_amount) : null,
    currency: latest?.currency ?? "USD",
    frequency: latest?.frequency ?? "annual",
    taxable: latest?.taxable ?? true,
    applyStatutory: latest?.apply_statutory ?? true,
    // New comp records must not be outranked by future-dated rows (e.g. a
    // hire that hasn't started yet), so default the effective date to cover them.
    effectiveDefault: (() => {
      const today = new Date().toISOString().slice(0, 10);
      const maxEffective = comp?.[0]?.effective_date ?? today;
      return maxEffective > today ? maxEffective : today;
    })(),
    locations: (locations ?? []).map((l) => ({ id: l.id, name: l.name })),
  };

  const dailyRate = latest?.base_amount != null
    ? annualize(Number(latest.base_amount), (latest.frequency ?? "annual") as CompFrequency) / 260
    : 0;

  return (
    <Profile
      data={data}
      edit={edit}
      isAdmin={access?.isAdmin ?? false}
      isSelf={!!worker.user_id && worker.user_id === access?.userId}
      hasLogin={!!worker.user_id}
      offboard={{
        status: worker.status,
        ptoDays: balance?.balance != null ? Number(balance.balance) : 0,
        dailyRate: Math.round(dailyRate * 100) / 100,
        currency: latest?.currency ?? "USD",
      }}
    />
  );
}
