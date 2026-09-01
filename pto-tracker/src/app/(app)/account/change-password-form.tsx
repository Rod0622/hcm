"use client";

import { useState } from "react";
import { changePassword } from "@/app/actions/account";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (next !== confirm) {
      setMessage({ kind: "error", text: "New passwords don't match." });
      return;
    }
    setBusy(true);
    const res = await changePassword({ current, next });
    setBusy(false);
    if (res.error) {
      setMessage({ kind: "error", text: res.error });
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setMessage({ kind: "ok", text: "Password updated." });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label" htmlFor="current">Current password</label>
        <input
          id="current"
          type="password"
          className="input"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="new">New password</label>
        <input
          id="new"
          type="password"
          className="input"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmNew">Confirm new password</label>
        <input
          id="confirmNew"
          type="password"
          className="input"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
          {message.text}
        </p>
      )}
      <button className="btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
