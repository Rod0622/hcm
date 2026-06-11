"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Table, Input, EmptyState, Dialog, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type OpeningRow = {
  id: string;
  title: string;
  dept: string;
  location: string;
  keywords: number;
  applicants: number;
  status: string;
  created: string;
};

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  open: { label: "Open", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  closed: { label: "Closed", tone: "neutral" },
};

/* "react*, typescript*, next.js, css" → keywords; * marks required (weight 3 vs 1). */
function parseKeywords(input: string) {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const required = s.endsWith("*");
      const term = required ? s.slice(0, -1).trim() : s;
      return { term: term.toLowerCase(), required, weight: required ? 3 : 1 };
    });
}

function NewOpeningDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [skills, setSkills] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const create = async () => {
    const keywords = parseKeywords(skills);
    if (!title.trim() || keywords.length === 0) {
      setError("Title and at least one skill are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: membership } = await supabase.from("tenant_users").select("tenant_id").limit(1).maybeSingle();
    if (!membership) {
      setError("No tenant membership found for your account.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("job_openings").insert({
      tenant_id: membership.tenant_id,
      title: title.trim(),
      keywords,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setTitle("");
    setSkills("");
    setBusy(false);
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      title="New opening"
      description="Skills are comma-separated; add * to mark a skill as required (resumes missing it are screened out)."
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={create} disabled={busy}>
            {busy ? "Creating…" : "Create opening"}
          </Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Input label="Job title" placeholder="e.g. Senior Backend Engineer" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Skills & keywords"
          placeholder="e.g. python*, postgres*, kubernetes, terraform"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

export function Openings({ rows }: { rows: OpeningRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <Page
      eyebrow="Workforce"
      title="Recruiting"
      actions={
        <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setDialogOpen(true)}>
          New opening
        </Button>
      }
    >
      <Card padding="0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Icon name="briefcase" size={18} />}
            title="No openings yet"
            description="Create an opening with its skill keywords, then upload resumes to screen applicants."
            action={<Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>New opening</Button>}
          />
        ) : (
          <Table
            rowKey="id"
            onRowClick={(r) => router.push(`/recruiting/${r.id}`)}
            columns={[
              { key: "title", label: "Opening", render: (r) => (
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.title}</span>
                  <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{r.keywords} screening keywords</span>
                </span>
              )},
              { key: "dept", label: "Department" },
              { key: "location", label: "Location" },
              { key: "applicants", label: "Applicants", mono: true, align: "right" },
              { key: "created", label: "Opened", mono: true },
              { key: "status", label: "Status", render: (r) => {
                const s = STATUS[r.status] ?? { label: r.status, tone: "neutral" as BadgeTone };
                return <Badge tone={s.tone} dot>{s.label}</Badge>;
              }},
            ]}
            rows={rows}
          />
        )}
      </Card>
      <NewOpeningDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Page>
  );
}
