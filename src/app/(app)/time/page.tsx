import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { TimeLeave, type ApprovalRow, type AttendanceWorker, type BalanceRow, type ClockEntry, type RequestRow } from "./time-client";

export const dynamic = "force-dynamic";

export default async function TimeLeavePage() {
  const supabase = await createClient();
  const access = await getAccess();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("workers")
    .select("id, tenant_id, manager_worker_id, entity:legal_entities(country_code)")
    .eq("user_id", user!.id)
    .maybeSingle();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);

  const [{ data: holidays }, { data: monthLeave }] = await Promise.all([
    supabase.from("holidays").select("country_code, holiday_date, name, kind").order("holiday_date"),
    supabase.from("leave_requests")
      .select("start_date, end_date, leave_type, requester:workers!leave_requests_worker_id_fkey(person:people(full_name))")
      .eq("status", "approved")
      .lte("start_date", monthEnd)
      .gte("end_date", monthStartIso),
  ]);

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  // include late-night sessions that started "yesterday" UTC for PH timezones
  const windowStart = new Date(todayStart.getTime() - 12 * 3600 * 1000).toISOString();

  const [{ data: balances }, { data: myRequests }, { data: approvals }, { data: myEntries }, { data: allEntries }] = await Promise.all([
    supabase.from("pto_balances").select("*").order("full_name"),
    me
      ? supabase
          .from("leave_requests")
          .select(`
            id, leave_type, start_date, end_date, days, reason, status, created_at,
            approver:workers!leave_requests_approver_worker_id_fkey(person:people(full_name))
          `)
          .eq("worker_id", me.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    me
      ? supabase
          .from("leave_requests")
          .select(`
            id, worker_id, leave_type, start_date, end_date, days, reason, status, created_at,
            requester:workers!leave_requests_worker_id_fkey(person:people(full_name))
          `)
          .eq("approver_worker_id", me.id)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    me
      ? supabase
          .from("time_entries")
          .select("id, kind, started_at, ended_at")
          .eq("worker_id", me.id)
          .gte("started_at", windowStart)
          .order("started_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    access?.isAdmin
      ? supabase
          .from("time_entries")
          .select("id, kind, started_at, ended_at, worker_id, worker:workers(person:people(full_name))")
          .gte("started_at", windowStart)
          .order("started_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const balanceRows: BalanceRow[] = (balances ?? []).map((b) => ({
    workerId: b.worker_id!,
    name: b.full_name!,
    country: b.country_code!,
    ratePerMonth: Number(b.accrual_per_month ?? 0),
    hired: formatDate(b.hired_on),
    accrued: Number(b.accrued ?? 0),
    used: Number(b.used ?? 0),
    pending: Number(b.pending ?? 0),
    balance: Number(b.balance ?? 0),
  }));

  const myBalance = me ? balanceRows.find((b) => b.workerId === me.id) ?? null : null;

  const requestRows: RequestRow[] = (myRequests ?? []).map((r) => ({
    id: r.id,
    type: r.leave_type,
    start: r.start_date,
    end: r.end_date,
    days: Number(r.days),
    reason: r.reason ?? "—",
    status: r.status,
    approver: r.approver?.person?.full_name ?? "—",
    filed: formatDate(r.created_at),
  }));

  const approvalRows: ApprovalRow[] = (approvals ?? []).map((r) => {
    const requesterBalance = balanceRows.find((b) => b.workerId === r.worker_id);
    return {
      id: r.id,
      requester: r.requester?.person?.full_name ?? "—",
      type: r.leave_type,
      start: r.start_date,
      end: r.end_date,
      days: Number(r.days),
      reason: r.reason ?? "—",
      balance: requesterBalance ? requesterBalance.balance : null,
    };
  });

  const clockEntries: ClockEntry[] = (myEntries ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    startedAt: e.started_at,
    endedAt: e.ended_at,
  }));

  const attendanceMap = new Map<string, AttendanceWorker>();
  for (const e of allEntries ?? []) {
    let rec = attendanceMap.get(e.worker_id);
    if (!rec) {
      rec = { workerId: e.worker_id, name: e.worker?.person?.full_name ?? "—", entries: [] };
      attendanceMap.set(e.worker_id, rec);
    }
    rec.entries.push({ id: e.id, kind: e.kind, startedAt: e.started_at, endedAt: e.ended_at });
  }

  return (
    <TimeLeave
      me={me ? { workerId: me.id, tenantId: me.tenant_id, managerWorkerId: me.manager_worker_id } : null}
      myBalance={myBalance}
      myRequests={requestRows}
      approvals={approvalRows}
      teamBalances={balanceRows}
      isAdmin={access?.isAdmin ?? false}
      clockEntries={clockEntries}
      attendance={Array.from(attendanceMap.values()).sort((a, b) => a.name.localeCompare(b.name))}
      myCountry={me?.entity?.country_code ?? null}
      holidays={(holidays ?? []).map((h) => ({ country: h.country_code, date: h.holiday_date, name: h.name, kind: h.kind }))}
      teamLeave={(monthLeave ?? []).map((l) => ({
        start: l.start_date,
        end: l.end_date,
        type: l.leave_type,
        name: l.requester?.person?.full_name ?? "—",
      }))}
    />
  );
}
