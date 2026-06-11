"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Table, Input, Select, Stat, EmptyState, Dialog, Banner, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { businessDays, LEAVE_STATUS, LEAVE_TYPE } from "@/lib/leave";

export type BalanceRow = {
  workerId: string;
  name: string;
  country: string;
  ratePerMonth: number;
  hired: string;
  accrued: number;
  used: number;
  pending: number;
  balance: number;
};

export type RequestRow = {
  id: string;
  type: string;
  start: string;
  end: string;
  days: number;
  reason: string;
  status: string;
  approver: string;
  filed: string;
};

export type ApprovalRow = {
  id: string;
  requester: string;
  type: string;
  start: string;
  end: string;
  days: number;
  reason: string;
  balance: number | null;
};

type Me = { workerId: string; tenantId: string; managerWorkerId: string | null };

const TYPE_OPTIONS = ["PTO", "Sick leave", "Unpaid leave"];
const TYPE_KEYS: Record<string, string> = { "PTO": "pto", "Sick leave": "sick", "Unpaid leave": "unpaid" };

function fmtDays(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function RequestDialog({ open, onClose, me, balance }: {
  open: boolean;
  onClose: () => void;
  me: Me;
  balance: BalanceRow | null;
}) {
  const router = useRouter();
  const [type, setType] = React.useState("PTO");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const days = start && end ? businessDays(start, end) : 0;
  const available = balance ? balance.balance - balance.pending : null;

  const submit = async () => {
    setError(null);
    if (days <= 0) {
      setError("Pick a valid date range (weekends don't count).");
      return;
    }
    const typeKey = TYPE_KEYS[type];
    if (typeKey === "pto" && available != null && days > available) {
      setError(`Not enough PTO: ${fmtDays(days)} day(s) requested, ${fmtDays(available)} available after pending requests.`);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("leave_requests").insert({
      tenant_id: me.tenantId,
      worker_id: me.workerId,
      leave_type: typeKey,
      start_date: start,
      end_date: end,
      days,
      reason: reason.trim() || null,
      approver_worker_id: me.managerWorkerId,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStart(""); setEnd(""); setReason("");
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      title="Request leave"
      description={me.managerWorkerId ? "Your manager is notified and must approve the request." : "No manager on file — the request is created unassigned."}
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
            {busy ? "Submitting…" : `Request ${days > 0 ? `${fmtDays(days)} day(s)` : "leave"}`}
          </Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Select label="Type" options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <Input label="First day" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="Last day" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Input label="Reason (optional)" placeholder="e.g. Family trip" value={reason} onChange={(e) => setReason(e.target.value)} />
        {days > 0 ? (
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>
            {fmtDays(days)} working day(s)
            {TYPE_KEYS[type] === "pto" && available != null ? ` · ${fmtDays(available)} available` : ""}
          </span>
        ) : null}
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

export function TimeLeave({ me, myBalance, myRequests, approvals, teamBalances }: {
  me: Me | null;
  myBalance: BalanceRow | null;
  myRequests: RequestRow[];
  approvals: ApprovalRow[];
  teamBalances: BalanceRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deciding, setDeciding] = React.useState<string | null>(null);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setDeciding(id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("leave_requests").update({
      status,
      decided_by: user?.id ?? null,
      decided_at: new Date().toISOString(),
    }).eq("id", id);
    setDeciding(null);
    router.refresh();
  };

  const cancel = async (id: string) => {
    const supabase = createClient();
    await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", id);
    router.refresh();
  };

  return (
    <Page
      eyebrow="Operations"
      title="Time & leave"
      actions={
        me ? (
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setDialogOpen(true)}>
            Request leave
          </Button>
        ) : null
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {!me ? (
          <Banner
            tone="info"
            title="Your login isn't linked to an employee record"
            description="Balances and requests are shown for the whole team below; link a worker to your account to file leave."
          />
        ) : null}

        {myBalance ? (
          <Card title="My PTO" subtitle={`Accrues ${fmtDays(myBalance.ratePerMonth)} day/month (${myBalance.country}) since ${myBalance.hired}`}>
            <div style={{ display: "flex", gap: 40 }}>
              <Stat label="Available" value={fmtDays(myBalance.balance - myBalance.pending)} hint="days" />
              <Stat label="Accrued to date" value={fmtDays(myBalance.accrued)} hint="days" />
              <Stat label="Used" value={fmtDays(myBalance.used)} hint="days" />
              <Stat label="Pending approval" value={fmtDays(myBalance.pending)} hint="days" />
            </div>
          </Card>
        ) : me ? (
          <Banner
            tone="info"
            title="No accrual policy for your country yet"
            description="You can still file sick or unpaid leave; PTO balances apply once a policy covers your legal entity's country."
          />
        ) : null}

        {approvals.length > 0 ? (
          <Card title="Waiting on you" subtitle={`${approvals.length} request(s) to approve`} padding="0">
            <Table
              rowKey="id"
              columns={[
                { key: "requester", label: "Employee", render: (r) => (
                  <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.requester}</span>
                )},
                { key: "type", label: "Type", render: (r) => <span>{LEAVE_TYPE[r.type] ?? r.type}</span> },
                { key: "dates", label: "Dates", mono: true, render: (r) => <span>{r.start} → {r.end}</span> },
                { key: "days", label: "Days", mono: true, align: "right", render: (r) => <span>{fmtDays(r.days)}</span> },
                { key: "balance", label: "Their balance", mono: true, align: "right", render: (r) => (
                  r.balance == null ? <span style={{ color: "var(--text-3)" }}>—</span> : (
                    <span style={{ color: r.days > r.balance ? "var(--danger-text)" : "var(--text-1)" }}>{fmtDays(r.balance)}</span>
                  )
                )},
                { key: "reason", label: "Reason" },
                { key: "actions", label: "", align: "right", render: (r) => (
                  <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Button variant="secondary" size="sm" disabled={deciding === r.id} onClick={() => decide(r.id, "rejected")}>Reject</Button>
                    <Button variant="primary" size="sm" disabled={deciding === r.id} onClick={() => decide(r.id, "approved")}>Approve</Button>
                  </span>
                )},
              ]}
              rows={approvals}
            />
          </Card>
        ) : null}

        {me ? (
          <Card title="My requests" padding="0">
            {myRequests.length === 0 ? (
              <EmptyState
                icon={<Icon name="calendar" size={18} />}
                title="No leave requests yet"
                description="File a request and your manager will be notified for approval."
                action={<Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>Request leave</Button>}
              />
            ) : (
              <Table
                rowKey="id"
                columns={[
                  { key: "type", label: "Type", render: (r) => <span>{LEAVE_TYPE[r.type] ?? r.type}</span> },
                  { key: "dates", label: "Dates", mono: true, render: (r) => <span>{r.start} → {r.end}</span> },
                  { key: "days", label: "Days", mono: true, align: "right", render: (r) => <span>{fmtDays(r.days)}</span> },
                  { key: "reason", label: "Reason" },
                  { key: "approver", label: "Approver" },
                  { key: "filed", label: "Filed", mono: true },
                  { key: "status", label: "Status", render: (r) => {
                    const s = LEAVE_STATUS[r.status] ?? { label: r.status, tone: "neutral" as BadgeTone };
                    return <Badge tone={s.tone} dot>{s.label}</Badge>;
                  }},
                  { key: "actions", label: "", align: "right", render: (r) => (
                    r.status === "pending" ? (
                      <Button variant="ghost" size="sm" onClick={() => cancel(r.id)}>Cancel</Button>
                    ) : null
                  )},
                ]}
                rows={myRequests}
              />
            )}
          </Card>
        ) : null}

        <Card title="PTO ledger" subtitle="Accrual-policy employees · 0.5 day/month for PH" padding="0">
          {teamBalances.length === 0 ? (
            <EmptyState
              icon={<Icon name="calendar" size={18} />}
              title="No employees under an accrual policy"
              description="Add a leave policy for a country and its employees appear here."
            />
          ) : (
            <Table
              rowKey="workerId"
              columns={[
                { key: "name", label: "Employee", render: (r) => (
                  <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.name}</span>
                )},
                { key: "country", label: "Country", mono: true },
                { key: "hired", label: "Hired", mono: true },
                { key: "ratePerMonth", label: "Accrual / mo", mono: true, align: "right", render: (r) => <span>{fmtDays(r.ratePerMonth)}</span> },
                { key: "accrued", label: "Accrued", mono: true, align: "right", render: (r) => <span>{fmtDays(r.accrued)}</span> },
                { key: "used", label: "Used", mono: true, align: "right", render: (r) => <span>{fmtDays(r.used)}</span> },
                { key: "pending", label: "Pending", mono: true, align: "right", render: (r) => (
                  <span style={{ color: r.pending > 0 ? "var(--warning-text)" : "var(--text-3)" }}>{fmtDays(r.pending)}</span>
                )},
                { key: "balance", label: "Balance", mono: true, align: "right", render: (r) => (
                  <span style={{ font: "var(--data-md)", color: r.balance <= 0 ? "var(--danger-text)" : "var(--success-text)" }}>{fmtDays(r.balance)}</span>
                )},
              ]}
              rows={teamBalances}
            />
          )}
        </Card>
      </div>
      {me ? <RequestDialog open={dialogOpen} onClose={() => setDialogOpen(false)} me={me} balance={myBalance} /> : null}
    </Page>
  );
}
