"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Paperclip, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings, Balance, PtoRequest, RequestType } from "@/lib/supabase/types";
import { businessDays, cutoffFor, sameCutoff, todayISO } from "@/lib/pto";
import { fmtCredits, fmtDate, fmtRange, STATUS_STYLES, TYPE_LABELS } from "@/lib/format";
import { cancelRequest, createRequest } from "@/app/actions/requests";

type RequestRow = PtoRequest & { proof_url: string | null };

export function RequestsClient({
  meId,
  requests,
  balance,
  settings,
}: {
  meId: string;
  requests: RequestRow[];
  balance: Balance;
  settings: AppSettings;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "1");
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingCancel, startCancel] = useTransition();

  async function onCancel(id: string) {
    startCancel(async () => {
      const res = await cancelRequest(id);
      if (res.error) setNotice(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">My PTO</h1>
          <p className="text-sm text-slate-500">
            {fmtCredits(balance.available)} credits available · {fmtCredits(balance.pending)}{" "}
            pending
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Close" : "File a request"}
        </button>
      </div>

      {notice && (
        <div className="card border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{notice}</div>
      )}

      {showForm && (
        <NewRequestForm
          meId={meId}
          available={Number(balance.available)}
          settings={settings}
          initialDate={searchParams.get("date") ?? ""}
          onDone={(msg) => {
            setShowForm(false);
            setNotice(msg ?? null);
            router.refresh();
          }}
        />
      )}

      <div className="card divide-y divide-slate-100">
        {requests.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No requests yet.</div>
        )}
        {requests.map((r) => (
          <div key={r.id} className="p-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{fmtRange(r.start_date, r.end_date)}</span>
                <span className={`badge ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                <span className="text-xs text-slate-500">
                  {TYPE_LABELS[r.type]} · {fmtCredits(Number(r.days))} day
                  {Number(r.days) === 1 ? "" : "s"}
                </span>
              </div>
              {r.type === "offset" && r.offset_date && (
                <p className="text-xs text-emerald-700">
                  Working instead on {fmtDate(r.offset_date)}
                </p>
              )}
              {r.reason && <p className="text-xs text-slate-500">{r.reason}</p>}
              {r.admin_note && (
                <p className="text-xs text-slate-500">
                  <span className="font-medium">HR note:</span> {r.admin_note}
                </p>
              )}
              {r.proof_url && (
                <a
                  href={r.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                >
                  <Paperclip className="h-3 w-3" /> View attached proof
                </a>
              )}
            </div>
            {r.status === "pending" && (
              <button
                className="btn-secondary !py-1 !px-3 text-xs"
                disabled={pendingCancel}
                onClick={() => onCancel(r.id)}
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewRequestForm({
  meId,
  available,
  settings,
  initialDate,
  onDone,
}: {
  meId: string;
  available: number;
  settings: AppSettings;
  initialDate: string;
  onDone: (notice?: string) => void;
}) {
  const [type, setType] = useState<RequestType>("pto");
  const [startDate, setStartDate] = useState(initialDate || todayISO());
  const [endDate, setEndDate] = useState(initialDate || todayISO());
  const [offsetDate, setOffsetDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const days = useMemo(
    () => (endDate >= startDate ? businessDays(startDate, endDate) : 0),
    [startDate, endDate]
  );
  const short = type === "pto" && days > available;
  const cutoff = useMemo(() => cutoffFor(startDate, settings), [startDate, settings]);
  const offsetOutsideCutoff =
    type === "offset" && !!offsetDate && !sameCutoff(offsetDate, startDate, settings);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (short) {
      setError("Not enough credits for paid time off — switch to unpaid or offset.");
      return;
    }
    setBusy(true);

    let proof_path: string | undefined;
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Proof file must be 10MB or smaller.");
        setBusy(false);
        return;
      }
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      proof_path = `${meId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("proofs").upload(proof_path, file);
      if (upErr) {
        setError(`Could not upload the proof: ${upErr.message}`);
        setBusy(false);
        return;
      }
    }

    const res = await createRequest({
      type,
      start_date: startDate,
      end_date: endDate,
      reason: reason || undefined,
      proof_path,
      offset_date: type === "offset" ? offsetDate || undefined : undefined,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onDone(res.warning ?? "Request filed — HR has been notified on Slack.");
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 space-y-4">
      <div>
        <span className="label">Type of leave</span>
        <div className="grid sm:grid-cols-3 gap-2">
          {(
            [
              ["pto", "Paid time off", `Uses credits · ${fmtCredits(available)} available`],
              ["unpaid", "Leave without pay", "No credits needed, day is unpaid"],
              ["offset", "Offset", "Work another day in the same cutoff (80 hrs)"],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-lg border p-3 text-sm ${
                type === value
                  ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="type"
                className="sr-only"
                checked={type === value}
                onChange={() => setType(value)}
              />
              <div className="font-medium">{label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{hint}</div>
            </label>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="start">First day off</label>
          <input
            id="start"
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate < e.target.value) setEndDate(e.target.value);
            }}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="end">Last day off</label>
          <input
            id="end"
            type="date"
            className="input"
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div className="self-end pb-2 text-sm text-slate-600">
          = <strong>{days}</strong> working day{days === 1 ? "" : "s"}
        </div>
      </div>

      {short && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            You only have <strong>{fmtCredits(available)}</strong> credits but this needs{" "}
            <strong>{days}</strong>. Choose <strong>Leave without pay</strong>, or{" "}
            <strong>Offset</strong> to make up the hours on another day in the same cutoff.
          </span>
        </div>
      )}

      {type === "offset" && (
        <div>
          <label className="label" htmlFor="offset">Day you'll work instead</label>
          <input
            id="offset"
            type="date"
            className="input"
            value={offsetDate}
            onChange={(e) => setOffsetDate(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Must be within the same payroll cutoff as the day off: {fmtDate(cutoff.start)} –{" "}
            {fmtDate(cutoff.end)} (payday {fmtDate(cutoff.payday)}). Weekends are fine — subject
            to HR approval.
          </p>
          {offsetOutsideCutoff && (
            <p className="mt-1 text-xs text-rose-600">
              That date is outside the {fmtDate(cutoff.start)} – {fmtDate(cutoff.end)} cutoff.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="label" htmlFor="reason">Reason (only HR sees this)</label>
        <textarea
          id="reason"
          className="input"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. medical appointment, family matter…"
        />
      </div>

      <div>
        <label className="label" htmlFor="proof">Proof (optional — e.g. med cert, image or PDF)</label>
        <input
          id="proof"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || days <= 0 || short || offsetOutsideCutoff}
        >
          {busy ? "Filing…" : "File request"}
        </button>
      </div>
    </form>
  );
}
