import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { Entities, type EntityRow } from "./entities-client";

export const dynamic = "force-dynamic";

export default async function EntitiesPage() {
  const supabase = await createClient();
  const access = await getAccess();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("tenant_users").select("tenant_id").eq("user_id", user!.id).limit(1).maybeSingle();

  const [{ data: entities }, { data: workers }, { data: locations }] = await Promise.all([
    supabase.from("legal_entities").select("id, name, country_code, currency, tax_registrations").order("name"),
    supabase.from("workers").select("legal_entity_id").in("status", ["active", "onboarding"]),
    supabase.from("locations").select("legal_entity_id"),
  ]);

  const headcount = new Map<string, number>();
  for (const w of workers ?? []) if (w.legal_entity_id) headcount.set(w.legal_entity_id, (headcount.get(w.legal_entity_id) ?? 0) + 1);
  const locCount = new Map<string, number>();
  for (const l of locations ?? []) if (l.legal_entity_id) locCount.set(l.legal_entity_id, (locCount.get(l.legal_entity_id) ?? 0) + 1);

  const rows: EntityRow[] = (entities ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    country: e.country_code,
    currency: e.currency,
    headcount: headcount.get(e.id) ?? 0,
    locations: locCount.get(e.id) ?? 0,
    taxId: ((e.tax_registrations ?? {}) as Record<string, string>).tax_id ?? "",
  }));

  return <Entities rows={rows} tenantId={membership?.tenant_id ?? ""} isAdmin={access?.isAdmin ?? false} />;
}
