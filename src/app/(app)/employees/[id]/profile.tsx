"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Avatar, Table, Tabs, IconButton, Stat, EmptyState, Dialog, Input, Select, Switch, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { FREQ_OPTIONS } from "@/lib/format";

export type ProfileData = {
  name: string;
  number: string;
  role: string;
  level: string;
  dept: string;
  location: string;
  entity: string;
  manager: string;
  type: string;
  email: string;
  phone: string;
  avatarSrc: string | null;
  start: string;
  status: string;
  statusTone: BadgeTone;
  salary: string;
  salaryHint: string;
  equity: string;
  compHistory: Array<{ date: string; event: string; amount: string; by: string }>;
  documents: Array<{ id: string; name: string; kind: string; date: string; status: string; tone: BadgeTone }>;
  activity: Array<{ when: string; who: string; what: string }>;
};

export type EditData = {
  workerId: string;
  personId: string;
  tenantId: string;
  orgUnitId: string | null;
  locationId: string | null;
  name: string;
  phone: string;
  title: string;
  level: string;
  salary: number | null;
  currency: string;
  frequency: string;
  taxable: boolean;
  applyStatutory: boolean;
  effectiveDefault: string;
  locations: Array<{ id: string; name: string }>;
};

const CURRENCIES = ["USD", "PHP", "SGD"];

async function uploadAvatar(tenantId: string, personId: string, file: File): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${tenantId}/${personId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
  if (error) return null;
  await supabase.from("people").update({ avatar_path: path }).eq("id", personId);
  return path;
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ font: "var(--label-caps)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>{k}</span>
      <span style={{ font: mono ? "var(--data-md)" : "var(--body-sm)", color: "var(--text-1)" }}>{v}</span>
    </div>
  );
}

function EditDialog({ open, onClose, edit, currentAvatar }: {
  open: boolean;
  onClose: () => void;
  edit: EditData;
  currentAvatar: string | null;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(edit.name);
  const [phone, setPhone] = React.useState(edit.phone);
  const [title, setTitle] = React.useState(edit.title);
  const [level, setLevel] = React.useState(edit.level);
  const [locationId, setLocationId] = React.useState(edit.locationId ?? "");
  const [salary, setSalary] = React.useState(edit.salary != null ? String(edit.salary) : "");
  const [currency, setCurrency] = React.useState(edit.currency);
  const [frequency, setFrequency] = React.useState(edit.frequency);
  const [taxable, setTaxable] = React.useState(edit.taxable);
  const [applyStatutory, setApplyStatutory] = React.useState(edit.applyStatutory);
  const [effectiveDate, setEffectiveDate] = React.useState(edit.effectiveDefault);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    setAvatarFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      if (avatarFile) {
        const path = await uploadAvatar(edit.tenantId, edit.personId, avatarFile);
        if (!path) throw new Error("Photo upload failed");
      }

      const { error: personError } = await supabase
        .from("people")
        .update({ full_name: name.trim(), phone: phone.trim() || null })
        .eq("id", edit.personId);
      if (personError) throw new Error(personError.message);

      // Role/level change: reuse a matching position or create a fresh one so
      // shared position rows aren't mutated under other employees.
      if (title.trim() !== edit.title || level.trim() !== edit.level) {
        const { data: existing } = await supabase
          .from("positions")
          .select("id")
          .eq("title", title.trim())
          .eq("level", level.trim())
          .limit(1)
          .maybeSingle();
        let positionId = existing?.id;
        if (!positionId) {
          const { data: created, error: positionError } = await supabase
            .from("positions")
            .insert({ tenant_id: edit.tenantId, org_unit_id: edit.orgUnitId, title: title.trim(), level: level.trim() || null })
            .select("id")
            .single();
          if (positionError) throw new Error(positionError.message);
          positionId = created.id;
        }
        const { error: workerError } = await supabase.from("workers").update({ position_id: positionId }).eq("id", edit.workerId);
        if (workerError) throw new Error(workerError.message);
      }

      if (locationId && locationId !== (edit.locationId ?? "")) {
        const { error: locationError } = await supabase.from("workers").update({ location_id: locationId }).eq("id", edit.workerId);
        if (locationError) throw new Error(locationError.message);
      }

      const newSalary = Number(salary.replace(/[, ]/g, ""));
      const payChanged = newSalary !== edit.salary || currency !== edit.currency
        || frequency !== edit.frequency || taxable !== edit.taxable || applyStatutory !== edit.applyStatutory;
      if (salary && Number.isFinite(newSalary) && newSalary > 0 && payChanged) {
        const { error: compError } = await supabase.from("compensation_records").insert({
          tenant_id: edit.tenantId,
          worker_id: edit.workerId,
          effective_date: effectiveDate || edit.effectiveDefault,
          event: "adjustment",
          base_amount: newSalary,
          currency,
          frequency,
          taxable,
          apply_statutory: applyStatutory,
          components: { approved_by_label: "Profile edit" },
          reason: "Profile edit",
        });
        if (compError) throw new Error(compError.message);
      }

      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      title="Edit profile"
      description="Salary changes are recorded in compensation history; all edits land in the audit log."
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={name || edit.name} size={44} src={preview ?? currentAvatar ?? undefined} />
          <Button variant="secondary" size="sm" icon={<Icon name="image-up" size={14} />} onClick={() => fileRef.current?.click()}>
            {avatarFile ? avatarFile.name : "Upload photo"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Contact number" placeholder="+63 917 555 0123" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Role / position" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Level" placeholder="e.g. L5" value={level} onChange={(e) => setLevel(e.target.value)} />
          <Select
            label="Location"
            options={[{ value: "", label: "— No location —" }, ...edit.locations.map((l) => ({ value: l.id, label: l.name }))]}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          />
          <Input label="Base salary" mono value={salary} onChange={(e) => setSalary(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Select label="Currency" options={CURRENCIES} value={currency} onChange={(e) => setCurrency(e.target.value)} />
            <Select label="Paid per" options={FREQ_OPTIONS} value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </div>
          <Input
            label="Salary effective date"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            hint={edit.effectiveDefault > new Date().toISOString().slice(0, 10) ? "Defaults to their start date so this change isn't overridden" : undefined}
          />
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
          <Switch label="Taxable (withholding tax)" checked={taxable} onChange={setTaxable} />
          <Switch label="Statutory deductions (SSS, PhilHealth…)" checked={applyStatutory} onChange={setApplyStatutory} />
        </div>
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 8, display: "block" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

function Overview({ P }: { P: ProfileData }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "var(--space-4)", alignItems: "start" }}>
      <Card title="Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5) var(--space-4)" }}>
          <KV k="Manager" v={P.manager} />
          <KV k="Department" v={P.dept} />
          <KV k="Location" v={P.location} />
          <KV k="Employment type" v={P.type} />
          <KV k="Legal entity" v={P.entity} />
          <KV k="Start date" v={P.start} mono />
          <KV k="Employee ID" v={P.number} mono />
          <KV k="Work email" v={P.email} mono />
          <KV k="Contact number" v={P.phone} mono />
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Card title="Compensation" actions={<IconButton label="Audit history"><Icon name="history" size={15} /></IconButton>}>
          <div style={{ display: "flex", gap: 40 }}>
            <Stat label="Base salary" value={P.salary} hint={P.salaryHint} />
            <Stat label="Level" value={P.level} mono={false} />
            <Stat label="Equity" value={P.equity} />
          </div>
        </Card>
        <Card title="Recent activity" padding="0">
          {P.activity.length === 0 ? (
            <EmptyState icon={<Icon name="history" size={18} />} title="No activity yet" description="Workflow and audit events for this employee will appear here." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {P.activity.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 20px", borderBottom: i === P.activity.length - 1 ? "none" : "1px solid var(--border-1)" }}>
                  <span style={{ width: 64, flexShrink: 0, font: "var(--weight-medium) var(--text-2xs)/1.4 var(--font-mono)", color: "var(--text-3)", paddingTop: 2 }}>{a.when}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                    <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>{a.who}</span>
                    <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{a.what}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Documents({ P }: { P: ProfileData }) {
  return (
    <Card title="Documents" subtitle={`${P.documents.length} on file`} padding="0" actions={<Button size="sm" variant="secondary" icon={<Icon name="plus" size={14} />}>Request document</Button>}>
      {P.documents.length === 0 ? (
        <EmptyState icon={<Icon name="file-text" size={18} />} title="No documents" description="Documents requested through workflows will appear here." />
      ) : (
        <Table
          rowKey="id"
          onRowClick={() => {}}
          columns={[
            { key: "name", label: "Document", render: (r) => <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="file-text" size={15} color="var(--text-3)" />{r.name}</span> },
            { key: "kind", label: "Type" },
            { key: "date", label: "Date", mono: true },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.tone} dot>{r.status}</Badge> },
          ]}
          rows={P.documents}
        />
      )}
    </Card>
  );
}

function Devices() {
  return (
    <Card title="Devices & access" subtitle="Managed by IT automation" padding="0">
      <EmptyState
        icon={<Icon name="laptop" size={18} />}
        title="No devices synced"
        description="Connect an MDM integration to track assigned devices and access here."
      />
    </Card>
  );
}

function Compensation({ P }: { P: ProfileData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Card>
        <div style={{ display: "flex", gap: 40 }}>
          <Stat label="Base salary" value={P.salary} hint={P.salaryHint} />
          <Stat label="Equity" value={P.equity} />
          <Stat label="Level" value={P.level} mono={false} />
        </div>
      </Card>
      <Card title="Compensation history" padding="0">
        <Table
          rowKey="date"
          columns={[
            { key: "date", label: "Effective", mono: true },
            { key: "event", label: "Event" },
            { key: "amount", label: "Amount", mono: true, align: "right" },
            { key: "by", label: "Approved by" },
          ]}
          rows={P.compHistory}
        />
      </Card>
    </div>
  );
}

export function Profile({ data: P, edit, isAdmin, isSelf }: {
  data: ProfileData;
  edit: EditData;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState("overview");
  const [editOpen, setEditOpen] = React.useState(false);
  const photoRef = React.useRef<HTMLInputElement>(null);

  const selfPhotoUpload = async (file: File) => {
    const path = await uploadAvatar(edit.tenantId, edit.personId, file);
    if (!path) alert("Photo upload failed");
    router.refresh();
  };

  return (
    <Page
      eyebrow="Employees"
      title={P.name}
      actions={
        <React.Fragment>
          {isSelf && !isAdmin ? (
            <Button variant="secondary" size="sm" icon={<Icon name="image-up" size={14} />} onClick={() => photoRef.current?.click()}>
              Change photo
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" icon={<Icon name="workflow" size={14} />}>Start workflow</Button>
          {isAdmin ? (
            <Button variant="primary" size="sm" icon={<Icon name="pencil" size={13} />} onClick={() => setEditOpen(true)}>
              Edit profile
            </Button>
          ) : null}
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={P.name} size={56} status="online" src={P.avatarSrc ?? undefined} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ font: "var(--title-page)", color: "var(--text-1)" }}>{P.name}</h1>
              <Badge tone={P.statusTone} dot>{P.status}</Badge>
              <Badge tone="neutral" mono>{P.number}</Badge>
            </div>
            <span style={{ font: "var(--body-sm)", color: "var(--text-2)" }}>{P.role} · {P.dept} · {P.location}</span>
          </div>
        </div>
        <Tabs
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "comp", label: "Compensation" },
            { value: "docs", label: "Documents", count: P.documents.length },
            { value: "devices", label: "Devices" },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "overview" ? <Overview P={P} /> : null}
        {tab === "comp" ? <Compensation P={P} /> : null}
        {tab === "docs" ? <Documents P={P} /> : null}
        {tab === "devices" ? <Devices /> : null}
      </div>

      <input
        ref={photoRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) selfPhotoUpload(f);
          e.target.value = "";
        }}
      />
      {isAdmin && editOpen ? (
        <EditDialog open={editOpen} onClose={() => setEditOpen(false)} edit={edit} currentAvatar={P.avatarSrc} />
      ) : null}
    </Page>
  );
}
