"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail, USERNAME_RE } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dateHired, setDateHired] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const uname = username.trim().toLowerCase();
    if (!USERNAME_RE.test(uname)) {
      setError("Username must be 3–32 characters: lowercase letters, numbers, . _ -");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(uname),
      password,
      options: {
        data: { username: uname, full_name: fullName.trim(), date_hired: dateHired },
      },
    });
    if (error) {
      setError(
        /already registered/i.test(error.message) ? "That username is taken." : error.message
      );
      setBusy(false);
      return;
    }
    if (!data.session) {
      // Email confirmations are still on in Supabase Auth settings; usernames
      // have no mailbox, so nothing would ever arrive.
      setError(
        "Account created but sign-in is blocked: ask the admin to disable " +
          '"Confirm email" in Supabase Auth settings, then sign in.'
      );
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-1 justify-center text-indigo-600">
          <CalendarCheck2 className="h-6 w-6" />
          <span className="text-lg font-semibold text-slate-900">PTO Tracker</span>
        </div>
        <p className="text-sm text-slate-500 text-center mb-6">Create your account</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jdelacruz"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="dateHired">Date hired</label>
            <input
              id="dateHired"
              type="date"
              className="input"
              value={dateHired}
              onChange={(e) => setDateHired(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              PTO accrues 0.5 credits per month from this date. HR can correct it later.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              className="input"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
          <p className="text-sm text-slate-500 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
