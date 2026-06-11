import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { timeDoctorConfigured } from "@/lib/timedoctor";
import { ConfigStudio, type ConfigData } from "./config-client";

export const dynamic = "force-dynamic";

const VISIBILITY_LABEL: Record<string, string> = {
  everyone: "Everyone",
  hr: "HR only",
  finance: "Finance",
  manager_chain: "Manager chain",
  self: "Self",
};

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: membership },
    { data: objects },
    { data: fields },
    { data: policies },
    { data: members },
    { data: workers },
    { data: ruleSets },
    { data: accounts },
    { count: queuedEmails },
  ] = await Promise.all([
    supabase.from("tenant_users").select("tenant_id, role").eq("user_id", user!.id).limit(1).maybeSingle(),
    supabase.from("object_definitions").select("id, key, label").order("label"),
    supabase.from("field_definitions")
      .select("id, key, label, field_type, required, visibility, object:object_definitions(label)")
      .is("archived_at", null)
      .order("position"),
    supabase.from("leave_policies").select("id, country_code, leave_type, name, accrual_per_month").order("country_code"),
    supabase.from("tenant_users").select("user_id, role, created_at").order("created_at"),
    supabase.from("workers").select("user_id, work_email, person:people(full_name)").not("user_id", "is", null),
    supabase.from("payroll_rule_sets").select("id, key, name, country_code, payroll_rule_versions(count)").order("name"),
    supabase.from("integration_accounts").select("provider, status, connected_at"),
    supabase.from("outbound_emails").select("id", { count: "exact", head: true }).eq("status", "queued"),
  ]);

  const workerByUser = new Map((workers ?? []).map((w) => [w.user_id!, w]));

  const data: ConfigData = {
    tenantId: membership?.tenant_id ?? "",
    currentUserId: user!.id,
    objects: (objects ?? []).map((o) => ({ id: o.id, key: o.key, label: o.label })),
    fields: (fields ?? []).map((f) => ({
      id: f.id,
      key: f.key,
      label: f.label,
      type: f.field_type.charAt(0).toUpperCase() + f.field_type.slice(1).replace("_", " "),
      object: f.object?.label ?? "—",
      required: f.required === "no" ? "No" : f.required === "yes" ? "Yes" : "Conditional",
      visibility: VISIBILITY_LABEL[f.visibility] ?? f.visibility,
    })),
    policies: (policies ?? []).map((p) => ({
      id: p.id,
      country: p.country_code,
      type: p.leave_type.toUpperCase(),
      name: p.name,
      rate: Number(p.accrual_per_month),
    })),
    members: (members ?? []).map((m) => {
      const w = workerByUser.get(m.user_id);
      return {
        userId: m.user_id,
        name: w?.person?.full_name ?? "Unlinked user",
        email: w?.work_email ?? m.user_id.slice(0, 8) + "…",
        role: m.role,
        since: formatDate(m.created_at),
      };
    }),
    ruleSets: (ruleSets ?? []).map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      country: r.country_code ?? "—",
      versions: r.payroll_rule_versions?.[0]?.count ?? 0,
    })),
    integrations: {
      timedoctor: timeDoctorConfigured(),
      resend: !!process.env.RESEND_API_KEY,
      queuedEmails: queuedEmails ?? 0,
      accounts: (accounts ?? []).map((a) => ({
        provider: a.provider,
        status: a.status,
        connected: a.connected_at ? formatDate(a.connected_at) : null,
      })),
    },
    restUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`,
  };

  return <ConfigStudio data={data} />;
}
