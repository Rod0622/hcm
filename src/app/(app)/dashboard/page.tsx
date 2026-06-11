import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import type { ClockEntry } from "@/components/time-clock";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const access = await getAccess();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("workers")
    .select("id, tenant_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  let clockEntries: ClockEntry[] = [];
  if (me) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const windowStart = new Date(todayStart.getTime() - 12 * 3600 * 1000).toISOString();
    const { data: entries } = await supabase
      .from("time_entries")
      .select("id, kind, started_at, ended_at")
      .eq("worker_id", me.id)
      .gte("started_at", windowStart)
      .order("started_at", { ascending: true });
    clockEntries = (entries ?? []).map((e) => ({
      id: e.id,
      kind: e.kind,
      startedAt: e.started_at,
      endedAt: e.ended_at,
    }));
  }

  return (
    <DashboardClient
      displayName={access?.displayName ?? "there"}
      isAdmin={access?.isAdmin ?? false}
      me={me ? { workerId: me.id, tenantId: me.tenant_id } : null}
      clockEntries={clockEntries}
    />
  );
}
