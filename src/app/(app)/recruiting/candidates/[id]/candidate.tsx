"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Avatar, Table, Switch, EmptyState, IconButton, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type CandidateData = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  firstSeen: string;
  hired: boolean;
  hiredApplicationId: string | null;
};

export type HistoryRow = {
  id: string;
  position: string;
  openingId: string | null;
  applied: string;
  score: number | null;
  status: string;
  offer: string;
  resumeUrl: string | null;
  signedOfferUrl: string | null;
};

export type EmailRow = {
  id: string;
  kind: string;
  subject: string;
  status: string;
  error: string | null;
  when: string;
};

export type AppGrantRow = {
  id: string;
  name: string;
  category: string;
  sso: boolean;
  granted: boolean;
};

const APP_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  new: { label: "New", tone: "info" },
  shortlisted: { label: "Shortlisted", tone: "success" },
  interviewing: { label: "Interviewing", tone: "info" },
  offer: { label: "Offer · awaiting signature", tone: "warning" },
  hired: { label: "Hired", tone: "success" },
  rejected: { label: "Rejected", tone: "neutral" },
};

const EMAIL_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  queued: { label: "Queued — no email provider", tone: "warning" },
  sent: { label: "Sent", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

const EMAIL_KIND: Record<string, string> = {
  offer: "Job offer",
  rejection: "Rejection",
  general: "General",
};

export function CandidateProfile({ candidate, history, emails, apps }: {
  candidate: CandidateData;
  history: HistoryRow[];
  emails: EmailRow[];
  apps: AppGrantRow[];
}) {
  const router = useRouter();
  const [busyApp, setBusyApp] = React.useState<string | null>(null);
  const grantedCount = apps.filter((a) => a.granted).length;

  const toggleAccess = async (app: AppGrantRow, on: boolean) => {
    setBusyApp(app.id);
    const supabase = createClient();
    if (on) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("access_grants").upsert(
        {
          tenant_id: candidate.tenantId,
          candidate_id: candidate.id,
          application_id: candidate.hiredApplicationId,
          app_id: app.id,
          status: "provisioned",
          granted_by: user?.id ?? null,
          provisioned_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,candidate_id,app_id" }
      );
    } else {
      await supabase
        .from("access_grants")
        .update({ status: "revoked" })
        .eq("candidate_id", candidate.id)
        .eq("app_id", app.id);
    }
    setBusyApp(null);
    router.refresh();
  };

  return (
    <Page eyebrow="Recruiting" title={candidate.name}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={candidate.name} size={56} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ font: "var(--title-page)", color: "var(--text-1)" }}>{candidate.name}</h1>
              {candidate.hired ? <Badge tone="success" dot>Hired</Badge> : null}
            </div>
            <span style={{ font: "var(--body-sm)", color: "var(--text-2)" }}>
              {candidate.email} · {candidate.phone} · first seen {candidate.firstSeen} · via {candidate.source}
            </span>
          </div>
        </div>

        <Card title="Application history" subtitle={`${history.length} position(s) applied`} padding="0">
          {history.length === 0 ? (
            <EmptyState icon={<Icon name="briefcase" size={18} />} title="No applications" description="This candidate hasn't applied to any opening yet." />
          ) : (
            <Table
              rowKey="id"
              columns={[
                { key: "position", label: "Position", render: (r) => (
                  r.openingId ? (
                    <Link href={`/recruiting/${r.openingId}`} style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)", textDecoration: "none" }}>
                      {r.position}
                    </Link>
                  ) : <span>{r.position}</span>
                )},
                { key: "applied", label: "Applied", mono: true },
                { key: "score", label: "Score", mono: true, align: "right", render: (r) => (
                  r.score == null ? <span style={{ color: "var(--text-3)" }}>—</span> : <span>{r.score}</span>
                )},
                { key: "offer", label: "Offer" },
                { key: "status", label: "Outcome", render: (r) => {
                  const s = APP_STATUS[r.status] ?? { label: r.status, tone: "neutral" as BadgeTone };
                  return <Badge tone={s.tone} dot>{s.label}</Badge>;
                }},
                { key: "files", label: "", align: "right", render: (r) => (
                  <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    {r.resumeUrl ? (
                      <a href={r.resumeUrl} target="_blank" rel="noreferrer" title="Resume">
                        <IconButton label="Resume"><Icon name="file-down" size={15} /></IconButton>
                      </a>
                    ) : null}
                    {r.signedOfferUrl ? (
                      <a href={r.signedOfferUrl} target="_blank" rel="noreferrer" title="Signed offer">
                        <IconButton label="Signed offer"><Icon name="file-badge" size={15} /></IconButton>
                      </a>
                    ) : null}
                  </span>
                )},
              ]}
              rows={history}
            />
          )}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", alignItems: "start" }}>
          <Card title="Emails sent" subtitle="Offer and rejection emails to this candidate" padding="0">
            {emails.length === 0 ? (
              <EmptyState icon={<Icon name="mail" size={18} />} title="No emails yet" description="Offers and rejection notices appear here once sent." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {emails.map((e, i) => {
                  const s = EMAIL_STATUS[e.status] ?? { label: e.status, tone: "neutral" as BadgeTone };
                  return (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: i === emails.length - 1 ? "none" : "1px solid var(--border-1)" }}>
                      <Icon name={e.kind === "offer" ? "mail-plus" : e.kind === "rejection" ? "mail-x" : "mail"} size={15} color="var(--text-3)" />
                      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                        <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</span>
                        <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{EMAIL_KIND[e.kind] ?? e.kind} · {e.when}</span>
                      </span>
                      <Badge tone={s.tone} dot>{s.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card
            title="Software access"
            subtitle={candidate.hired
              ? `${grantedCount} of ${apps.length} apps granted · SSO apps provision through the IdP`
              : "Unlocks once the signed offer is uploaded and the candidate is hired"}
            padding="0"
          >
            <div style={{ display: "flex", flexDirection: "column", opacity: candidate.hired ? 1 : 0.55 }}>
              {apps.map((a, i) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", borderBottom: i === apps.length - 1 ? "none" : "1px solid var(--border-1)" }}>
                  <Icon name="app-window" size={15} color="var(--text-3)" />
                  <span style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{a.name}</span>
                    <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{a.category}</span>
                  </span>
                  {a.sso ? <Badge tone="info">SSO</Badge> : <Badge tone="neutral">Manual</Badge>}
                  <Switch
                    checked={a.granted}
                    disabled={!candidate.hired || busyApp === a.id}
                    onChange={(on) => toggleAccess(a, on)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
