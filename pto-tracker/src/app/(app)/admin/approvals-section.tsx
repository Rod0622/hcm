"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Paperclip, X } from "lucide-react";
import type { PtoRequest } from "@/lib/supabase/types";
import { fmtCredits, fmtDate, fmtRange, STATUS_STYLES, TYPE_LABELS } from "@/lib/format";
import { decideRequest } from "@/app/actions/requests";

export type PendingRow = PtoRequest & {
  profiles: { full_name: string; username: string } | null;
  proof_url: string | null;
};

export function ApprovalsSection({ pending, recent }: { pending: PendingRow[]; recent: PendingRow[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function decide(id: string, decision: "approved" | "denied") {
    setBusyId(id);
    startTransition(async () => {
      const res = await decideRequest({ id, decision, admin_note: notes[id] || undefined });
      setNotice(res.error ?? res.warning ?? null);
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Pending approvals</h2>
      {notice && (
        <div className="card border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{notice}</div>
      )}
      <div className="card divide-y divide-slate-100">
        {pending.length === 0 && (
          <div className="p-6 text-sm text-slate-500">Nothing waiting — all caught up.</div>
        )}
        {pending.map((r) => (
          <div key={r.id} className="p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-semibold">{r.profiles?.full_name ?? "Unknown"}</span>
              <span className="text-slate-500">{fmtRange(r.start_date, r.end_date)}</span>
              <span className="badge bg-slate-100 text-slate-600 ring-slate-500/20">
                {TYPE_LABELS[r.type]}
              </span>
              <span className="text-xs text-slate-500">
                {fmtCredits(Number(r.days))} day{Number(r.days) === 1 ? "" : "s"}
              </span>
              {r.type === "offset" && r.offset_date && (
                <span className="text-xs text-emerald-700">
                  works instead on {fmtDate(r.offset_date)}
                </span>
              )}
            </div>
            {r.reason && <p className="text-xs text-slate-500">Reason: {r.reason}</p>}
            {r.proof_url && (
              <a
                href={r.proof_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                <Paperclip className="h-3 w-3" /> View proof
              </a>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                className="input !w-72 !py-1.5 text-xs"
                placeholder="Note to the employee (optional)"
                value={notes[r.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
              />
              <button
                className="btn-primary !py-1.5 text-xs"
                disabled={busyId === r.id}
                onClick={() => decide(r.id, "approved")}
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                className="btn-danger !py-1.5 text-xs"
                disabled={busyId === r.id}
                onClick={() => decide(r.id, "denied")}
              >
                <X className="h-3.5 w-3.5" /> Deny
              </button>
            </div>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            Recent decisions
          </summary>
          <div className="mt-3 divide-y divide-slate-100">
            {recent.map((r) => (
              <div key={r.id} className="py-2 flex items-center gap-2 flex-wrap text-sm">
                <span className="font-medium">{r.profiles?.full_name ?? "Unknown"}</span>
                <span className="text-slate-500">{fmtRange(r.start_date, r.end_date)}</span>
                <span className={`badge ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                <span className="text-xs text-slate-400">{TYPE_LABELS[r.type]}</span>
                {r.admin_note && <span className="text-xs text-slate-400">“{r.admin_note}”</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
