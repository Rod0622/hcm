import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tdUsers, tdWorklogs, timeDoctorConfigured } from "@/lib/timedoctor";

/* Pulls the last 7 days of Time Doctor worklogs into time_entries.
   Idempotent: entries are keyed by external_id, users matched by email. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: membership } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership || !["owner", "admin", "hr", "finance"].includes(membership.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!timeDoctorConfigured()) {
    return NextResponse.json({
      configured: false,
      message: "Time Doctor isn't connected yet — set TIMEDOCTOR_API_TOKEN and TIMEDOCTOR_COMPANY_ID env vars to enable the sync.",
    });
  }

  try {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 3600 * 1000);

    const [users, logs, { data: workers }, { data: existing }] = await Promise.all([
      tdUsers(),
      tdWorklogs(from.toISOString(), to.toISOString()),
      supabase.from("workers").select("id, work_email").eq("tenant_id", membership.tenant_id),
      supabase.from("time_entries").select("external_id").eq("tenant_id", membership.tenant_id).eq("source", "timedoctor"),
    ]);

    const workerByEmail = new Map((workers ?? []).filter((w) => w.work_email).map((w) => [w.work_email!.toLowerCase(), w.id]));
    const emailByTdUser = new Map(users.map((u) => [u.id, u.email]));
    const seen = new Set((existing ?? []).map((e) => e.external_id));

    let imported = 0;
    let unmatched = 0;
    for (const log of logs) {
      const email = emailByTdUser.get(log.userId);
      const workerId = email ? workerByEmail.get(email) : undefined;
      if (!workerId) {
        unmatched++;
        continue;
      }
      const externalId = log.id ?? `${log.userId}:${log.start}`;
      if (seen.has(externalId)) continue;
      const startedAt = new Date(log.start);
      const endedAt = new Date(startedAt.getTime() + log.durationSec * 1000);
      const { error } = await supabase.from("time_entries").insert({
        tenant_id: membership.tenant_id,
        worker_id: workerId,
        kind: log.mode === "break" ? "break" : "work",
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        source: "timedoctor",
        external_id: externalId,
        note: log.mode,
      });
      if (!error) {
        seen.add(externalId);
        imported++;
      }
    }

    return NextResponse.json({ configured: true, fetched: logs.length, imported, unmatched });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Time Doctor sync failed" }, { status: 502 });
  }
}
