"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Input, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      {error ? (
        <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--status-danger)" }}>{error}</span>
      ) : null}
      <Button variant="primary" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-base)", padding: "var(--space-6)",
    }}>
      <div style={{ width: 360, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logotype-black.png" alt="Tenkara" style={{ height: 22, width: "auto" }} />
          <span style={{ font: "var(--body-sm)", color: "var(--text-3)" }}>Sign in to your workspace</span>
        </div>
        <Card>
          <React.Suspense>
            <LoginForm />
          </React.Suspense>
        </Card>
      </div>
    </div>
  );
}
