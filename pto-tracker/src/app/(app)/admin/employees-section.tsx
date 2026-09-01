"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";
import { fmtCredits, fmtDate } from "@/lib/format";
import { adminUpdateEmployee } from "@/app/actions/account";

export type EmployeeRow = Profile & {
  accrued: number;
  used: number;
  pending: number;
  available: number;
};

export function EmployeesSection({ employees, meId }: { employees: EmployeeRow[]; meId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function save(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await adminUpdateEmployee({
        id,
        full_name: String(fd.get("full_name") ?? ""),
        date_hired: String(fd.get("date_hired") ?? "") || null,
        role: String(fd.get("role")) === "admin" ? "admin" : "employee",
        active: fd.get("active") === "on",
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Employees</h2>
        <p className="text-sm text-slate-500">
          Credits accrue 0.5 per completed month from the hire date (6/year).
        </p>
      </div>
      {error && (
        <div className="card border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Employee</th>
              <th className="px-4 py-2.5">Hired</th>
              <th className="px-4 py-2.5 text-right">Accrued</th>
              <th className="px-4 py-2.5 text-right">Used</th>
              <th className="px-4 py-2.5 text-right">Pending</th>
              <th className="px-4 py-2.5 text-right">Available</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((p) =>
              editing === p.id ? (
                <tr key={p.id} className="bg-indigo-50/40">
                  <td colSpan={8} className="px-4 py-3">
                    <form
                      onSubmit={(e) => save(e, p.id)}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <div>
                        <label className="label text-xs">Full name</label>
                        <input name="full_name" className="input !w-48" defaultValue={p.full_name} required />
                      </div>
                      <div>
                        <label className="label text-xs">Date hired</label>
                        <input
                          name="date_hired"
                          type="date"
                          className="input !w-40"
                          defaultValue={p.date_hired ?? ""}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Role</label>
                        <select name="role" className="input !w-32" defaultValue={p.role}>
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 pb-2 text-sm">
                        <input type="checkbox" name="active" defaultChecked={p.active} /> Active
                      </label>
                      <button className="btn-primary !py-1.5 text-xs" disabled={busy}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !py-1.5 text-xs"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">
                      {p.full_name}
                      {p.id === meId && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                    </div>
                    <div className="text-xs text-slate-400">@{p.username}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{fmtDate(p.date_hired)}</td>
                  <td className="px-4 py-2.5 text-right">{fmtCredits(p.accrued)}</td>
                  <td className="px-4 py-2.5 text-right">{fmtCredits(p.used)}</td>
                  <td className="px-4 py-2.5 text-right">{fmtCredits(p.pending)}</td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold ${
                      p.available < 1 ? "text-rose-600" : "text-slate-900"
                    }`}
                  >
                    {fmtCredits(p.available)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`badge ${
                        p.role === "admin"
                          ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20"
                          : "bg-slate-100 text-slate-600 ring-slate-500/20"
                      }`}
                    >
                      {p.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      className="text-slate-400 hover:text-indigo-600"
                      onClick={() => setEditing(p.id)}
                      title="Edit employee"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
