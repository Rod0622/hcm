"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Table, Input, Select, Dialog, EmptyState, IconButton, Banner, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type RequestItem = {
  id: string;
  workerId: string;
  who: string;
  mine: boolean;
  kind: string;
  details: string;
  status: string;
  filed: string;
  fileName: string | null;
  fileUrl: string | null;
};

const KIND_LABEL: Record<string, string> = {
  coe: "Certificate of Employment",
  coe_with_salary: "COE with salary",
  payslip_copy: "Payslip copy",
  other: "Other",
};
const KIND_OPTIONS = Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }));
const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "warning" },
  ready: { label: "Ready", tone: "success" },
  rejected: { label: "Rejected", tone: "neutral" },
};

export function Requests({ me, isAdmin, rows }: {
  me: { workerId: string; tenantId: string } | null;
  isAdmin: boolean;
  rows: RequestItem[];
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [kind, setKind] = React.useState("coe");
  const [details, setDetails] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [fulfillFor, setFulfillFor] = React.useState<RequestItem | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const mine = rows.filter((r) => r.mine);
  const queue = rows.filter((r) => !r.mine || isAdmin);

  const submit = async () => {
    if (!me) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("doc_requests").insert({
      tenant_id: me.tenantId,
      worker_id: me.workerId,
      kind,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDetails("");
    setAdding(false);
    router.refresh();
  };

  const fulfill = async (file: File) => {
    if (!fulfillFor || !me) return;
    const supabase = createClient();
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
    const path = `${me.tenantId}/${fulfillFor.workerId}/${fulfillFor.id}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("hr-docs").upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setFulfillFor(null);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("doc_requests").update({
      status: "ready",
      file_path: path,
      file_name: file.name,
      decided_by: user?.id ?? null,
      decided_at: new Date().toISOString(),
    }).eq("id", fulfillFor.id);
    setFulfillFor(null);
    router.refresh();
  };

  const reject = async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("doc_requests").update({
      status: "rejected",
      decided_by: user?.id ?? null,
      decided_at: new Date().toISOString(),
    }).eq("id", id);
    router.refresh();
  };

  const columns = (showWho: boolean, withAdminActions: boolean) => [
    ...(showWho ? [{ key: "who", label: "Employee" }] : []),
    { key: "kind", label: "Document", render: (r: RequestItem) => <span>{KIND_LABEL[r.kind] ?? r.kind}</span> },
    { key: "details", label: "Details" },
    { key: "filed", label: "Requested", mono: true },
    { key: "status", label: "Status", render: (r: RequestItem) => {
      const s = STATUS[r.status] ?? { label: r.status, tone: "neutral" as BadgeTone };
      return <Badge tone={s.tone} dot>{s.label}</Badge>;
    }},
    { key: "actions", label: "", align: "right" as const, render: (r: RequestItem) => (
      <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        {r.fileUrl ? (
          <a href={r.fileUrl} target="_blank" rel="noreferrer" title={r.fileName ?? "Document"}>
            <IconButton label="Download"><Icon name="file-down" size={15} /></IconButton>
          </a>
        ) : null}
        {withAdminActions && r.status === "pending" ? (
          <React.Fragment>
            <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>Reject</Button>
            <Button size="sm" variant="secondary" onClick={() => { setFulfillFor(r); fileRef.current?.click(); }}>
              Upload & fulfill
            </Button>
          </React.Fragment>
        ) : null}
      </span>
    )},
  ];

  return (
    <Page
      eyebrow="Operations"
      title="Requests"
      actions={
        me ? (
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setAdding(true)}>
            Request document
          </Button>
        ) : null
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {!me ? (
          <Banner tone="info" title="Your login isn't linked to an employee record" description="Document requests are filed against your employee record." />
        ) : null}

        {me ? (
          <Card title="My requests" subtitle="Certificates of employment, payslip copies, and more" padding="0">
            {mine.length === 0 ? (
              <EmptyState
                icon={<Icon name="file-text" size={18} />}
                title="No requests yet"
                description="Need a COE for a loan or visa? File a request and HR is notified."
                action={<Button variant="primary" size="sm" onClick={() => setAdding(true)}>Request document</Button>}
              />
            ) : (
              <Table rowKey="id" columns={columns(false, false)} rows={mine} />
            )}
          </Card>
        ) : null}

        {isAdmin ? (
          <Card title="HR queue" subtitle="Pending requests notify owners, admins, and HR" padding="0">
            {queue.length === 0 ? (
              <EmptyState icon={<Icon name="circle-check" size={18} />} title="Queue is clear" description="Employee document requests appear here." />
            ) : (
              <Table rowKey="id" columns={columns(true, true)} rows={queue} />
            )}
          </Card>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.png,.jpg"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) fulfill(f);
          e.target.value = "";
        }}
      />

      <Dialog
        open={adding}
        title="Request a document"
        description="HR is notified and uploads the document here once it's ready."
        onClose={() => setAdding(false)}
        footer={
          <React.Fragment>
            <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit request"}</Button>
          </React.Fragment>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Select label="Document" options={KIND_OPTIONS} value={kind} onChange={(e) => setKind(e.target.value)} />
          <Input label="Details (optional)" placeholder="e.g. For a bank loan application — addressed to BPI" value={details} onChange={(e) => setDetails(e.target.value)} />
          {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
        </div>
      </Dialog>
    </Page>
  );
}
