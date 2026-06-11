import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { TimeLeave, type ApprovalRow, type BalanceRow, type RequestRow } from "./time-client";

export const dynamic = "force-dynamic";

export default async function TimeLeavePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("workers")
    .select("id, tenant_id, manager_worker_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const [{ data: balances }, { data: myRequests }, { data: approvals }] = await Promise.all([
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

  return (
    <TimeLeave
      me={me ? { workerId: me.id, tenantId: me.tenant_id, managerWorkerId: me.manager_worker_id } : null}
      myBalance={myBalance}
      myRequests={requestRows}
      approvals={approvalRows}
      teamBalances={balanceRows}
    />
  );
}
