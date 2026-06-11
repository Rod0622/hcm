"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, Badge, Button, Stat, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type ClockEntry = {
  id: string;
  kind: string;
  startedAt: string;
  endedAt: string | null;
};

export function fmtClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function entryMinutes(e: ClockEntry, now: number) {
  const end = e.endedAt ? new Date(e.endedAt).getTime() : now;
  return Math.max(0, (end - new Date(e.startedAt).getTime()) / 60000);
}

export function summarize(entries: ClockEntry[], now: number) {
  const work = entries.filter((e) => e.kind === "work");
  const breaks = entries.filter((e) => e.kind === "break");
  const open = entries.find((e) => !e.endedAt) ?? null;
  const lastEnded = entries.filter((e) => e.endedAt).map((e) => e.endedAt!).sort().pop() ?? null;
  return {
    open,
    firstIn: work.length ? work[0].startedAt : null,
    lastOut: open ? null : lastEnded,
    workMins: work.reduce((s, e) => s + entryMinutes(e, now), 0),
    breakMins: breaks.reduce((s, e) => s + entryMinutes(e, now), 0),
  };
}

export function TimeClock({ workerId, tenantId, entries }: {
  workerId: string;
  tenantId: string;
  entries: ClockEntry[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const s = summarize(entries, now);
  const status = s.open ? (s.open.kind === "work" ? "Working" : "On break") : s.lastOut ? "Clocked out" : "Not clocked in";
  const statusTone: BadgeTone = s.open ? (s.open.kind === "work" ? "success" : "warning") : "neutral";

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
    router.refresh();
  };

  const supabase = () => createClient();
  const endOpen = async () => {
    if (s.open) await supabase().from("time_entries").update({ ended_at: new Date().toISOString() }).eq("id", s.open.id);
  };
  const start = async (kind: "work" | "break") => {
    await supabase().from("time_entries").insert({ tenant_id: tenantId, worker_id: workerId, kind });
  };

  return (
    <Card
      title="Time clock"
      subtitle={s.firstIn ? `In at ${fmtClock(s.firstIn)}${s.lastOut ? ` · out at ${fmtClock(s.lastOut)}` : ""}` : "You haven't clocked in today"}
      actions={<Badge tone={statusTone} dot>{status}</Badge>}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Stat label="Worked today" value={fmtMins(s.workMins)} />
        <Stat label="Breaks" value={fmtMins(s.breakMins)} />
        {s.open ? <Stat label={s.open.kind === "work" ? "Working since" : "On break since"} value={fmtClock(s.open.startedAt)} /> : null}
        <span style={{ flex: 1 }} />
        <span style={{ display: "flex", gap: 8 }}>
          {!s.open ? (
            <Button variant="primary" size="sm" disabled={busy} icon={<Icon name="play" size={13} />}
              onClick={() => run(() => start("work"))}>
              Clock in
            </Button>
          ) : null}
          {s.open?.kind === "work" ? (
            <Button variant="secondary" size="sm" disabled={busy} icon={<Icon name="coffee" size={13} />}
              onClick={() => run(async () => { await endOpen(); await start("break"); })}>
              Start break
            </Button>
          ) : null}
          {s.open?.kind === "break" ? (
            <Button variant="primary" size="sm" disabled={busy} icon={<Icon name="play" size={13} />}
              onClick={() => run(async () => { await endOpen(); await start("work"); })}>
              End break
            </Button>
          ) : null}
          {s.open ? (
            <Button variant="secondary" size="sm" disabled={busy} icon={<Icon name="square" size={13} />}
              onClick={() => run(endOpen)}>
              Clock out
            </Button>
          ) : null}
        </span>
      </div>
    </Card>
  );
}
