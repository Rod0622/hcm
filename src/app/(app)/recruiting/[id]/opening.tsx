"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Table, Input, Select, Stat, EmptyState, IconButton, Dialog, Banner, type BadgeTone } from "@/components/ui";
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
  candidateId: string | null;
  name: string;
  email: string;
  score: number | null;
  matched: string[];
  missingRequired: string[];
  status: string;
  uploaded: string;
  resumeName: string | null;
  resumeUrl: string | null;
  offer: {
    id: string;
    summary: string;
    startDate: string;
    status: string;
    signedUrl: string | null;
  } | null;
};

const APP_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  new: { label: "New", tone: "info" },
  shortlisted: { label: "Shortlisted", tone: "success" },
  interviewing: { label: "Interviewing", tone: "info" },
  offer: { label: "Offer · awaiting signature", tone: "warning" },
  hired: { label: "Hired", tone: "success" },
  rejected: { label: "Rejected", tone: "neutral" },
};

const IN_PLAY = ["new", "shortlisted", "interviewing"];
const CURRENCIES = ["USD", "PHP", "SGD"];
const FREQUENCIES = ["Annual", "Monthly", "Hourly"];

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

function OfferDialog({ applicant, onClose }: { applicant: ApplicantRow | null; onClose: () => void }) {
  const router = useRouter();
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [frequency, setFrequency] = React.useState("Annual");
  const [startDate, setStartDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!applicant) return;
    const value = Number(amount.replace(/[, ]/g, ""));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid compensation amount.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/recruiting/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: applicant.id,
        amount: value,
        currency,
        frequency: frequency.toLowerCase(),
        startDate: startDate || null,
        notes: notes || null,
      }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Could not create the offer");
      return;
    }
    setAmount(""); setNotes(""); setStartDate("");
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open={!!applicant}
      title={`Send offer — ${applicant?.name ?? ""}`}
      description={`The offer email goes to ${applicant?.email ?? "the candidate"}; the application stays pending until you upload their signed offer.`}
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy} icon={<Icon name="send" size={13} />}>
            {busy ? "Sending…" : "Send offer"}
          </Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "var(--space-3)" }}>
          <Input label="Compensation" placeholder="e.g. 2400000" mono value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select label="Currency" options={CURRENCIES} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          <Select label="Per" options={FREQUENCIES} value={frequency} onChange={(e) => setFrequency(e.target.value)} />
        </div>
        <Input label="Proposed start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="Notes for the email (optional)" placeholder="e.g. Includes HMO from day 1 and a signing bonus of ₱50,000" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

export type PendingRejection = { id: string; count: number; requested: string };

export function OpeningDetail({ opening, applicants, isAdmin, pendingRejection }: {
  opening: OpeningData;
  applicants: ApplicantRow[];
  isAdmin: boolean;
  pendingRejection: PendingRejection | null;
}) {
  const router = useRouter();
  const [offerTarget, setOfferTarget] = React.useState<ApplicantRow | null>(null);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectBusy, setRejectBusy] = React.useState(false);
  const [decideBusy, setDecideBusy] = React.useState(false);
  const [declineTarget, setDeclineTarget] = React.useState<ApplicantRow | null>(null);
  const [signedFor, setSignedFor] = React.useState<string | null>(null);
  const signedInputRef = React.useRef<HTMLInputElement>(null);

  const scored = applicants.filter((a) => a.score != null);
  const passing = scored.filter((a) => (a.score ?? 0) >= SCREEN_THRESHOLD).length;
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length) : 0;
  const remaining = applicants.filter((a) => IN_PLAY.includes(a.status));

  const setStatus = async (id: string, value: string) => {
    const supabase = createClient();
    await supabase.from("applications").update({ status: value }).eq("id", id);
    router.refresh();
  };

  const uploadSigned = async (file: File) => {
    if (!signedFor) return;
    const form = new FormData();
    form.append("offerId", signedFor);
    form.append("file", file);
    const res = await fetch("/api/recruiting/offer/signed", { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not upload the signed offer");
    }
    setSignedFor(null);
    router.refresh();
  };

  const requestRejection = async () => {
    setRejectBusy(true);
    const res = await fetch("/api/recruiting/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingId: opening.id }),
    });
    setRejectBusy(false);
    if (res.ok) {
      setRejectOpen(false);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not submit the rejection batch");
    }
  };

  const decideRejection = async (decision: "approve" | "cancel") => {
    if (!pendingRejection) return;
    setDecideBusy(true);
    const res = await fetch("/api/recruiting/reject/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: pendingRejection.id, decision }),
    });
    setDecideBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not decide the rejection batch");
    }
    router.refresh();
  };

  const markOfferDeclined = async () => {
    if (!declineTarget?.offer) return;
    const supabase = createClient();
    await supabase.from("offers").update({ status: "declined" }).eq("id", declineTarget.offer.id);
    await supabase.from("applications").update({ status: "rejected" }).eq("id", declineTarget.id);
    setDeclineTarget(null);
    router.refresh();
  };

  return (
    <Page
      eyebrow="Recruiting"
      title={opening.title}
      actions={
        remaining.length > 0 && !pendingRejection ? (
          <Button variant="secondary" size="sm" icon={<Icon name="mail-x" size={14} />} onClick={() => setRejectOpen(true)}>
            Reject remaining & notify
          </Button>
        ) : null
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {pendingRejection ? (
          <Banner
            tone="warning"
            title={`Rejection emails awaiting approval — ${pendingRejection.count} candidate(s)`}
            description={
              isAdmin
                ? `Requested ${pendingRejection.requested}. Approving sends the emails; anyone moved to the offer stage since is excluded. If your offered candidate declines, mark the offer declined and pick someone else before approving.`
                : `Requested ${pendingRejection.requested}. An owner or admin must approve before any email is sent.`
            }
            action={
              isAdmin ? (
                <span style={{ display: "flex", gap: 6 }}>
                  <Button variant="secondary" size="sm" disabled={decideBusy} onClick={() => decideRejection("cancel")}>Cancel batch</Button>
                  <Button variant="danger" size="sm" disabled={decideBusy} onClick={() => decideRejection("approve")}>
                    {decideBusy ? "Working…" : "Approve & send"}
                  </Button>
                </span>
              ) : null
            }
          />
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ font: "var(--title-page)", color: "var(--text-1)" }}>{opening.title}</h1>
          <Badge tone={opening.status === "open" ? "success" : "neutral"} dot>{opening.status === "open" ? "Open" : opening.status}</Badge>
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

        <Card title="Applicants" subtitle="Ranked by keyword match score · click a name for full history" padding="0">
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
                    {r.candidateId ? (
                      <Link href={`/recruiting/candidates/${r.candidateId}`} style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)", textDecoration: "none" }}>
                        {r.name}
                      </Link>
                    ) : (
                      <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.name}</span>
                    )}
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
                { key: "offer", label: "Offer", render: (r) => (
                  r.offer ? (
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ font: "var(--data-md)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{r.offer.summary}</span>
                      <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: r.offer.status === "declined" ? "var(--danger-text)" : "var(--text-3)" }}>
                        {r.offer.status === "signed" ? "Signed" : r.offer.status === "declined" ? "Declined by candidate" : `Starts ${r.offer.startDate}`}
                      </span>
                    </span>
                  ) : <span style={{ color: "var(--text-3)" }}>—</span>
                )},
                { key: "uploaded", label: "Applied", mono: true },
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
                    {IN_PLAY.includes(r.status) ? (
                      <React.Fragment>
                        <IconButton label="Send job offer" onClick={() => setOfferTarget(r)}>
                          <Icon name="mail-plus" size={15} />
                        </IconButton>
                        {r.status !== "shortlisted" ? (
                          <IconButton label="Shortlist" onClick={() => setStatus(r.id, "shortlisted")}>
                            <Icon name="thumbs-up" size={15} />
                          </IconButton>
                        ) : null}
                      </React.Fragment>
                    ) : null}
                    {r.status === "offer" && r.offer && r.offer.status === "sent" ? (
                      <React.Fragment>
                        <IconButton
                          label="Upload signed offer"
                          onClick={() => { setSignedFor(r.offer!.id); signedInputRef.current?.click(); }}
                        >
                          <Icon name="file-check" size={15} />
                        </IconButton>
                        <IconButton label="Candidate declined the offer" onClick={() => setDeclineTarget(r)}>
                          <Icon name="ban" size={15} />
                        </IconButton>
                      </React.Fragment>
                    ) : null}
                    {r.offer?.signedUrl ? (
                      <a href={r.offer.signedUrl} target="_blank" rel="noreferrer" title="Signed offer">
                        <IconButton label="Signed offer"><Icon name="file-badge" size={15} /></IconButton>
                      </a>
                    ) : null}
                  </span>
                )},
              ]}
              rows={applicants}
            />
          )}
        </Card>
      </div>

      <input
        ref={signedInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadSigned(file);
          e.target.value = "";
        }}
      />

      <OfferDialog applicant={offerTarget} onClose={() => setOfferTarget(null)} />

      <Dialog
        open={rejectOpen}
        title="Request rejection of remaining candidates"
        description={`No emails are sent yet: this submits ${remaining.length} candidate(s) for owner/admin approval. Approve it once your offer is signed — if the offered candidate declines, you can still pick someone else from this list before approving.`}
        onClose={() => setRejectOpen(false)}
        footer={
          <React.Fragment>
            <Button variant="secondary" size="sm" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={requestRejection} disabled={rejectBusy}>
              {rejectBusy ? "Submitting…" : "Submit for approval"}
            </Button>
          </React.Fragment>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {remaining.map((r) => (
            <span key={r.id} style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>
              {r.name} · {r.email}
            </span>
          ))}
        </div>
      </Dialog>

      <Dialog
        open={!!declineTarget}
        title={`Offer declined — ${declineTarget?.name ?? ""}`}
        description="Marks the offer as declined by the candidate and closes their application. Remaining candidates stay in play, so you can send a new offer to someone else."
        onClose={() => setDeclineTarget(null)}
        footer={
          <React.Fragment>
            <Button variant="secondary" size="sm" onClick={() => setDeclineTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={markOfferDeclined}>Mark declined</Button>
          </React.Fragment>
        }
      />
    </Page>
  );
}
