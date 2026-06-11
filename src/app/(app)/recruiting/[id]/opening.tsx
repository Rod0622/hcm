"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Table, Stat, EmptyState, IconButton, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { SCREEN_THRESHOLD, type OpeningKeyword } from "@/lib/ats";

export type OpeningData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dept: string;
  location: string;
  entity: string;
  keywords: OpeningKeyword[];
};

export type ApplicantRow = {
  id: string;
  name: string;
  email: string;
  score: number | null;
  matched: string[];
  missingRequired: string[];
  status: string;
  uploaded: string;
  resumeName: string | null;
  resumeUrl: string | null;
};

const APP_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  new: { label: "New", tone: "info" },
  shortlisted: { label: "Shortlisted", tone: "success" },
  interviewing: { label: "Interviewing", tone: "info" },
  offer: { label: "Offer", tone: "warning" },
  hired: { label: "Hired", tone: "success" },
  rejected: { label: "Rejected", tone: "neutral" },
};

function scoreColor(score: number) {
  if (score >= SCREEN_THRESHOLD) return "var(--success-text)";
  if (score >= 40) return "var(--warning-text)";
  return "var(--danger-text)";
}

type UploadItem = { name: string; state: "queued" | "processing" | "done" | "failed"; score?: number; error?: string };

function UploadZone({ openingId, onComplete }: { openingId: string; onComplete: () => void }) {
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const busy = items.some((i) => i.state === "queued" || i.state === "processing");

  const process = async (files: File[]) => {
    if (files.length === 0 || busy) return;
    setItems(files.map((f) => ({ name: f.name, state: "queued" })));
    for (let i = 0; i < files.length; i++) {
      setItems((prev) => prev.map((it, j) => (j === i ? { ...it, state: "processing" } : it)));
      try {
        const form = new FormData();
        form.append("openingId", openingId);
        form.append("file", files[i]);
        const res = await fetch("/api/recruiting/upload", { method: "POST", body: form });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `Upload failed (${res.status})`);
        setItems((prev) => prev.map((it, j) => (j === i ? { ...it, state: "done", score: body.score } : it)));
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed";
        setItems((prev) => prev.map((it, j) => (j === i ? { ...it, state: "failed", error: message } : it)));
      }
    }
    onComplete();
  };

  return (
    <Card title="Upload resumes" subtitle="PDF, DOCX, TXT — drop multiple files for bulk screening">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); process(Array.from(e.dataTransfer.files)); }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          padding: "28px 16px", cursor: busy ? "wait" : "pointer",
          border: `1.5px dashed ${dragging ? "var(--border-focus)" : "var(--border-1)"}`,
          borderRadius: "var(--radius-md)",
          background: dragging ? "var(--info-subtle)" : "var(--bg-base)",
          transition: "background var(--duration-base), border-color var(--duration-base)",
        }}
      >
        <Icon name="upload" size={20} color="var(--text-3)" />
        <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>
          {busy ? "Screening…" : "Drop resumes here or click to browse"}
        </span>
        <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
          Each file is scored against this opening&apos;s keywords on upload
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          style={{ display: "none" }}
          onChange={(e) => { process(Array.from(e.target.files ?? [])); e.target.value = ""; }}
        />
      </div>
      {items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--body-sm)", fontSize: "var(--text-xs)" }}>
              <Icon
                name={it.state === "done" ? "circle-check" : it.state === "failed" ? "circle-x" : "loader"}
                size={14}
                color={it.state === "done" ? "var(--success-text)" : it.state === "failed" ? "var(--danger-text)" : "var(--text-3)"}
              />
              <span style={{ color: "var(--text-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
              {it.state === "done" && it.score != null ? (
                <span style={{ font: "var(--data-md)", fontSize: "var(--text-xs)", color: scoreColor(it.score) }}>{it.score}</span>
              ) : null}
              {it.state === "failed" ? <span style={{ color: "var(--danger-text)" }}>{it.error}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function OpeningDetail({ opening, applicants }: { opening: OpeningData; applicants: ApplicantRow[] }) {
  const router = useRouter();
  const status = APP_STATUS[opening.status] ?? { label: opening.status, tone: "neutral" as BadgeTone };
  const scored = applicants.filter((a) => a.score != null);
  const passing = scored.filter((a) => (a.score ?? 0) >= SCREEN_THRESHOLD).length;
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length) : 0;

  const setStatus = async (id: string, value: string) => {
    const supabase = createClient();
    await supabase.from("applications").update({ status: value }).eq("id", id);
    router.refresh();
  };

  return (
    <Page eyebrow="Recruiting" title={opening.title}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ font: "var(--title-page)", color: "var(--text-1)" }}>{opening.title}</h1>
          <Badge tone={opening.status === "open" ? "success" : "neutral"} dot>{opening.status === "open" ? "Open" : status.label}</Badge>
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
            {opening.dept} · {opening.location} · {opening.entity}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--space-4)", alignItems: "start" }}>
          <UploadZone openingId={opening.id} onComplete={() => router.refresh()} />
          <Card title="Screening keywords" subtitle={`Pass line: ${SCREEN_THRESHOLD} · required skills cap the score when missing`}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {opening.keywords.map((k) => (
                <Badge key={k.term} tone={k.required ? "info" : "neutral"}>
                  {k.term}{k.required ? " · required" : ""}
                </Badge>
              ))}
            </div>
            <div style={{ display: "flex", gap: 32, marginTop: 16 }}>
              <Stat label="Applicants" value={String(applicants.length)} />
              <Stat label="Above pass line" value={String(passing)} />
              <Stat label="Avg score" value={String(avg)} />
            </div>
          </Card>
        </div>

        <Card title="Applicants" subtitle="Ranked by keyword match score" padding="0">
          {applicants.length === 0 ? (
            <EmptyState
              icon={<Icon name="users" size={18} />}
              title="No applicants yet"
              description="Upload resumes above — they're scored and ranked automatically."
            />
          ) : (
            <Table
              rowKey="id"
              columns={[
                { key: "rank", label: "#", mono: true, render: (r) => (
                  <span style={{ font: "var(--data-md)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
                    {applicants.indexOf(r) + 1}
                  </span>
                )},
                { key: "name", label: "Candidate", render: (r) => (
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.name}</span>
                    <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{r.email}</span>
                  </span>
                )},
                { key: "score", label: "Score", align: "right", render: (r) => (
                  r.score == null ? <span style={{ color: "var(--text-3)" }}>—</span> : (
                    <span style={{ font: "var(--data-md)", color: scoreColor(r.score) }}>{r.score}</span>
                  )
                )},
                { key: "matched", label: "Matched skills", render: (r) => (
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {r.matched.slice(0, 4).map((m) => <Badge key={m} tone="success">{m}</Badge>)}
                    {r.matched.length > 4 ? (
                      <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)", alignSelf: "center" }}>
                        +{r.matched.length - 4}
                      </span>
                    ) : null}
                    {r.missingRequired.map((m) => <Badge key={m} tone="danger">missing: {m}</Badge>)}
                  </span>
                )},
                { key: "uploaded", label: "Received", mono: true },
                { key: "status", label: "Status", render: (r) => {
                  const s = APP_STATUS[r.status] ?? { label: r.status, tone: "neutral" as BadgeTone };
                  return <Badge tone={s.tone} dot>{s.label}</Badge>;
                }},
                { key: "actions", label: "", align: "right", render: (r) => (
                  <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                    {r.resumeUrl ? (
                      <a href={r.resumeUrl} target="_blank" rel="noreferrer" title={r.resumeName ?? "Resume"}>
                        <IconButton label="Download resume"><Icon name="file-down" size={15} /></IconButton>
                      </a>
                    ) : null}
                    {r.status !== "shortlisted" ? (
                      <IconButton label="Shortlist" onClick={() => setStatus(r.id, "shortlisted")}>
                        <Icon name="thumbs-up" size={15} />
                      </IconButton>
                    ) : null}
                    {r.status !== "rejected" ? (
                      <IconButton label="Reject" onClick={() => setStatus(r.id, "rejected")}>
                        <Icon name="thumbs-down" size={15} />
                      </IconButton>
                    ) : null}
                  </span>
                )},
              ]}
              rows={applicants}
            />
          )}
        </Card>
      </div>
    </Page>
  );
}
