"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Avatar, Table, Switch, EmptyState, IconButton, Button, Dialog, Input, Select, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type ConvertData = {
  applicationId: string;
  openingTitle: string;
  offerAmount: number | null;
  offerCurrency: string;
  startDate: string;
  suggestedNumber: string;
  entities: Array<{ id: string; name: string; currency: string }>;
  orgUnits: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  managers: Array<{ id: string; name: string }>;
};

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
  hiredWorkerId: string | null;
};

function ConvertDialog({ open, onClose, candidate, convert }: {
  open: boolean;
  onClose: () => void;
  candidate: CandidateData;
  convert: ConvertData;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(convert.openingTitle);
  const [level, setLevel] = React.useState("");
  const [entityId, setEntityId] = React.useState(convert.entities[0]?.id ?? "");
  const [orgUnitId, setOrgUnitId] = React.useState(convert.orgUnits[0]?.id ?? "");
  const [locationId, setLocationId] = React.useState(convert.locations[0]?.id ?? "");
  const [managerId, setManagerId] = React.useState("");
  const [number, setNumber] = React.useState(convert.suggestedNumber);
  const [startDate, setStartDate] = React.useState(convert.startDate);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    if (!title.trim() || !entityId || !startDate) {
      setError("Position, legal entity, and start date are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data: person, error: personError } = await supabase
        .from("people")
        .insert({
          tenant_id: candidate.tenantId,
          full_name: candidate.name,
          email: candidate.email !== "—" ? candidate.email : null,
          phone: candidate.phone !== "—" ? candidate.phone : null,
        })
        .select("id")
        .single();
      if (personError) throw new Error(personError.message);

      const { data: existingPosition } = await supabase
        .from("positions")
        .select("id")
        .eq("title", title.trim())
        .eq("level", level.trim())
        .limit(1)
        .maybeSingle();
      let positionId = existingPosition?.id;
      if (!positionId) {
        const { data: created, error: positionError } = await supabase
          .from("positions")
          .insert({ tenant_id: candidate.tenantId, org_unit_id: orgUnitId || null, title: title.trim(), level: level.trim() || null })
          .select("id")
          .single();
        if (positionError) throw new Error(positionError.message);
        positionId = created.id;
      }

      const { data: worker, error: workerError } = await supabase
        .from("workers")
        .insert({
          tenant_id: candidate.tenantId,
          person_id: person.id,
          legal_entity_id: entityId,
          position_id: positionId,
          org_unit_id: orgUnitId || null,
          location_id: locationId || null,
          manager_worker_id: managerId || null,
          employee_number: number.trim() || null,
          status: "onboarding",
          work_email: candidate.email !== "—" ? candidate.email : null,
          hired_on: startDate,
        })
        .select("id")
        .single();
      if (workerError) throw new Error(workerError.message);

      if (convert.offerAmount != null) {
        await supabase.from("compensation_records").insert({
          tenant_id: candidate.tenantId,
          worker_id: worker.id,
          effective_date: startDate,
          event: "hire",
          base_amount: convert.offerAmount,
          currency: convert.offerCurrency,
          frequency: "annual",
          components: { approved_by_label: "Signed offer" },
          reason: "Hired via recruiting",
        });
      }

      await supabase.from("applications").update({ hired_worker_id: worker.id }).eq("id", convert.applicationId);

      onClose();
      router.push(`/employees/${worker.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      title={`Convert to employee — ${candidate.name}`}
      description="Creates the employee record with compensation from the signed offer; they appear in the directory, org chart, payroll, and PTO accrual immediately."
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy} icon={<Icon name="user-plus" size={13} />}>
            {busy ? "Creating…" : "Create employee"}
          </Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        <Input label="Position" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Level" placeholder="e.g. L4" value={level} onChange={(e) => setLevel(e.target.value)} />
        <Select label="Legal entity" options={convert.entities.map((x) => ({ value: x.id, label: x.name }))} value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        <Select label="Department" options={convert.orgUnits.map((x) => ({ value: x.id, label: x.name }))} value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)} />
        <Select label="Location" options={convert.locations.map((x) => ({ value: x.id, label: x.name }))} value={locationId} onChange={(e) => setLocationId(e.target.value)} />
        <Select label="Manager" options={[{ value: "", label: "— None —" }, ...convert.managers.map((x) => ({ value: x.id, label: x.name }))]} value={managerId} onChange={(e) => setManagerId(e.target.value)} />
        <Input label="Employee number" mono value={number} onChange={(e) => setNumber(e.target.value)} />
        <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      {convert.offerAmount != null ? (
        <p style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)", marginTop: 12 }}>
          Compensation from signed offer: {convert.offerAmount.toLocaleString()} {convert.offerCurrency} / yr
        </p>
      ) : null}
      {error ? <p style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 8 }}>{error}</p> : null}
    </Dialog>
  );
}

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

export function CandidateProfile({ candidate, history, emails, apps, convert }: {
  candidate: CandidateData;
  history: HistoryRow[];
  emails: EmailRow[];
  apps: AppGrantRow[];
  convert: ConvertData | null;
}) {
  const router = useRouter();
  const [busyApp, setBusyApp] = React.useState<string | null>(null);
  const [convertOpen, setConvertOpen] = React.useState(false);
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
    <Page
      eyebrow="Recruiting"
      title={candidate.name}
      actions={
        convert ? (
          <Button variant="primary" size="sm" icon={<Icon name="user-plus" size={14} />} onClick={() => setConvertOpen(true)}>
            Convert to employee
          </Button>
        ) : candidate.hiredWorkerId ? (
          <Button variant="secondary" size="sm" icon={<Icon name="user" size={14} />} onClick={() => router.push(`/employees/${candidate.hiredWorkerId}`)}>
            View employee record
          </Button>
        ) : null
      }
    >
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
      {convert ? (
        <ConvertDialog open={convertOpen} onClose={() => setConvertOpen(false)} candidate={candidate} convert={convert} />
      ) : null}
    </Page>
  );
}
