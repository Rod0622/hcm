"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Table, Input, Select, Switch, Dialog, Banner, SideNavItem, SideNavSection, IconButton, EmptyState, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type ConfigData = {
  tenantId: string;
  currentUserId: string;
  objects: Array<{ id: string; key: string; label: string }>;
  fields: Array<{ id: string; key: string; label: string; type: string; object: string; required: string; visibility: string }>;
  policies: Array<{ id: string; country: string; type: string; name: string; rate: number }>;
  members: Array<{ userId: string; name: string; email: string; role: string; since: string }>;
  ruleSets: Array<{ id: string; key: string; name: string; country: string; versions: number }>;
  integrations: {
    timedoctor: boolean;
    resend: boolean;
    queuedEmails: number;
    accounts: Array<{ provider: string; status: string; connected: string | null }>;
  };
  restUrl: string;
};

const AREAS = [
  { id: "objects", label: "Objects & fields", icon: "database" },
  { id: "forms", label: "Forms", icon: "clipboard-list" },
  { id: "policies", label: "Policies", icon: "scale" },
  { id: "payrollrules", label: "Payroll rules", icon: "calculator" },
  { id: "roles", label: "Roles & permissions", icon: "lock-keyhole" },
  { id: "integrations", label: "Integrations", icon: "plug" },
  { id: "api", label: "API & webhooks", icon: "braces" },
];

const TYPE_ICONS: Record<string, string> = { Text: "type", Select: "list", Date: "calendar", Contact: "user", Reference: "link", Boolean: "toggle-left", Number: "hash", Currency: "banknote", File: "paperclip" };
const FIELD_TYPES = ["Text", "Number", "Date", "Boolean", "Select", "Contact", "Reference", "Currency", "File"];
const VISIBILITY_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "hr", label: "HR only" },
  { value: "finance", label: "Finance" },
  { value: "manager_chain", label: "Manager chain" },
  { value: "self", label: "Self" },
];
const ROLES = ["owner", "admin", "hr", "finance", "manager", "member"];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function SectionHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ font: "var(--title-section)", color: "var(--text-1)" }}>{title}</h1>
        <p style={{ font: "var(--body-sm)", color: "var(--text-3)", marginTop: 2 }}>{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}

/* ---------- Objects & fields ---------- */
function ObjectsSection({ data }: { data: ConfigData }) {
  const router = useRouter();
  const [objectFilter, setObjectFilter] = React.useState("All objects");
  const [adding, setAdding] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState("Text");
  const [visibility, setVisibility] = React.useState("hr");
  const [required, setRequired] = React.useState(false);
  const [targetObject, setTargetObject] = React.useState(data.objects[0]?.label ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const filtered = data.fields.filter((f) => objectFilter === "All objects" || f.object === objectFilter);

  const addField = async () => {
    const object = data.objects.find((o) => o.label === targetObject);
    if (!label.trim() || !object) {
      setError("Field name and object are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("field_definitions").insert({
      tenant_id: data.tenantId,
      object_id: object.id,
      key: slugify(label),
      label: label.trim(),
      field_type: type.toLowerCase(),
      required: required ? "yes" : "no",
      visibility,
      position: data.fields.length + 1,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setLabel("");
    setAdding(false);
    router.refresh();
  };

  const archive = async (id: string) => {
    const supabase = createClient();
    await supabase.from("field_definitions").update({ archived_at: new Date().toISOString() }).eq("id", id);
    router.refresh();
  };

  return (
    <React.Fragment>
      <SectionHeader
        title="Custom fields"
        subtitle="Every object supports custom fields; archived fields keep their historical values."
        actions={
          <React.Fragment>
            <Select options={["All objects", ...data.objects.map((o) => o.label)]} value={objectFilter} onChange={(e) => setObjectFilter(e.target.value)} style={{ width: 160 }} />
            <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setAdding(true)}>Add field</Button>
          </React.Fragment>
        }
      />
      <Card padding="0">
        {filtered.length === 0 ? (
          <EmptyState icon={<Icon name="database" size={18} />} title="No fields yet" description="Add a custom field to this object." />
        ) : (
          <Table
            compact
            rowKey="id"
            columns={[
              { key: "label", label: "Field", render: (r) => <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name={TYPE_ICONS[r.type] || "type"} size={14} color="var(--text-3)" />{r.label}</span> },
              { key: "key", label: "Key", mono: true },
              { key: "type", label: "Type", render: (r) => <Badge tone="neutral">{r.type}</Badge> },
              { key: "object", label: "Object" },
              { key: "required", label: "Required" },
              { key: "visibility", label: "Visible to" },
              { key: "actions", label: "", align: "right", render: (r) => (
                <IconButton label="Archive field" onClick={() => archive(r.id)}>
                  <Icon name="archive" size={14} />
                </IconButton>
              )},
            ]}
            rows={filtered}
          />
        )}
      </Card>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add field"
        description="The field is available immediately; the key is derived from the name."
        footer={
          <React.Fragment>
            <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={addField} disabled={busy}>{busy ? "Adding…" : "Add field"}</Button>
          </React.Fragment>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Field name" placeholder="e.g. Certification expiry" value={label} onChange={(e) => setLabel(e.target.value)} hint={label ? `key: ${slugify(label)}` : undefined} />
          <Select label="Object" options={data.objects.map((o) => o.label)} value={targetObject} onChange={(e) => setTargetObject(e.target.value)} />
          <Select label="Type" options={FIELD_TYPES} value={type} onChange={(e) => setType(e.target.value)} />
          <Select label="Visible to" options={VISIBILITY_OPTIONS} value={visibility} onChange={(e) => setVisibility(e.target.value)} />
          <Switch label="Required" checked={required} onChange={setRequired} />
          {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
        </div>
      </Dialog>
    </React.Fragment>
  );
}

/* ---------- Policies ---------- */
function PoliciesSection({ data }: { data: ConfigData }) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<ConfigData["policies"][number] | null>(null);
  const [country, setCountry] = React.useState("");
  const [type, setType] = React.useState("PTO");
  const [name, setName] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const openEdit = (p: ConfigData["policies"][number]) => {
    setEditing(p);
    setRate(String(p.rate));
    setError(null);
  };

  const save = async () => {
    const value = Number(rate);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a valid accrual rate.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    let dbError = null;
    if (editing) {
      ({ error: dbError } = await supabase.from("leave_policies").update({ accrual_per_month: value }).eq("id", editing.id));
    } else {
      if (!country.trim() || !name.trim()) {
        setError("Country code and name are required.");
        setBusy(false);
        return;
      }
      ({ error: dbError } = await supabase.from("leave_policies").insert({
        tenant_id: data.tenantId,
        country_code: country.trim().toUpperCase(),
        leave_type: type.toLowerCase(),
        name: name.trim(),
        accrual_per_month: value,
      }));
    }
    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setAdding(false);
    setEditing(null);
    setCountry(""); setName(""); setRate("");
    router.refresh();
  };

  return (
    <React.Fragment>
      <SectionHeader
        title="Leave policies"
        subtitle="Accrual per completed month of service, by country. Balances recompute automatically."
        actions={<Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => { setAdding(true); setError(null); }}>New policy</Button>}
      />
      <Card padding="0">
        {data.policies.length === 0 ? (
          <EmptyState icon={<Icon name="scale" size={18} />} title="No leave policies" description="Add a country policy and its employees start accruing." />
        ) : (
          <Table
            compact
            rowKey="id"
            columns={[
              { key: "country", label: "Country", mono: true },
              { key: "type", label: "Leave type" },
              { key: "name", label: "Policy" },
              { key: "rate", label: "Accrual / month", mono: true, align: "right", render: (r) => <span>{r.rate} day{r.rate === 1 ? "" : "s"}</span> },
              { key: "actions", label: "", align: "right", render: (r) => (
                <IconButton label="Edit accrual" onClick={() => openEdit(r)}>
                  <Icon name="pencil" size={14} />
                </IconButton>
              )},
            ]}
            rows={data.policies}
          />
        )}
      </Card>

      <Dialog
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null); }}
        title={editing ? `Edit accrual — ${editing.name}` : "New leave policy"}
        description={editing ? "Applies immediately; balances are computed live from this rate." : "Applies to all employees whose legal entity is in this country."}
        footer={
          <React.Fragment>
            <Button variant="secondary" size="sm" onClick={() => { setAdding(false); setEditing(null); }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </React.Fragment>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!editing ? (
            <React.Fragment>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Country code" placeholder="e.g. PH" value={country} onChange={(e) => setCountry(e.target.value)} mono />
                <Select label="Leave type" options={["PTO", "Sick"]} value={type} onChange={(e) => setType(e.target.value)} />
              </div>
              <Input label="Policy name" placeholder="e.g. PH monthly PTO accrual" value={name} onChange={(e) => setName(e.target.value)} />
            </React.Fragment>
          ) : null}
          <Input label="Accrual per month (days)" placeholder="e.g. 0.5" mono value={rate} onChange={(e) => setRate(e.target.value)} />
          {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
        </div>
      </Dialog>
    </React.Fragment>
  );
}

/* ---------- Payroll rules ---------- */
function PayrollRulesSection({ data }: { data: ConfigData }) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const create = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("payroll_rule_sets").insert({
      tenant_id: data.tenantId,
      key: slugify(name),
      name: name.trim(),
      country_code: country.trim() ? country.trim().toUpperCase() : null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName(""); setCountry("");
    setAdding(false);
    router.refresh();
  };

  return (
    <React.Fragment>
      <SectionHeader
        title="Payroll rules"
        subtitle="Versioned rule sets (earnings, taxes, deductions) scoped by country or entity."
        actions={<Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setAdding(true)}>New rule set</Button>}
      />
      <Banner
        tone="info"
        title="Definitions only for now"
        description="Rule sets are stored and versioned; the calculation engine that executes them in payroll runs is next on the backlog."
      />
      <Card padding="0">
        {data.ruleSets.length === 0 ? (
          <EmptyState icon={<Icon name="calculator" size={18} />} title="No rule sets yet" description="Create one per country to hold its statutory logic, e.g. PH statutory 2026." />
        ) : (
          <Table
            compact
            rowKey="id"
            columns={[
              { key: "name", label: "Rule set" },
              { key: "key", label: "Key", mono: true },
              { key: "country", label: "Country", mono: true },
              { key: "versions", label: "Versions", mono: true, align: "right" },
            ]}
            rows={data.ruleSets}
          />
        )}
      </Card>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="New payroll rule set"
        footer={
          <React.Fragment>
            <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={create} disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
          </React.Fragment>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Name" placeholder="e.g. PH statutory 2026" value={name} onChange={(e) => setName(e.target.value)} hint={name ? `key: ${slugify(name)}` : undefined} />
          <Input label="Country code (optional)" placeholder="e.g. PH" mono value={country} onChange={(e) => setCountry(e.target.value)} />
          {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
        </div>
      </Dialog>
    </React.Fragment>
  );
}

/* ---------- Roles & permissions ---------- */
function RolesSection({ data }: { data: ConfigData }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const setRole = async (userId: string, role: string) => {
    setBusy(userId);
    const supabase = createClient();
    await supabase.from("tenant_users").update({ role }).eq("user_id", userId).eq("tenant_id", data.tenantId);
    setBusy(null);
    router.refresh();
  };

  return (
    <React.Fragment>
      <SectionHeader
        title="Roles & permissions"
        subtitle="Owner, admin, HR, and finance get full access; managers and members see only their own records."
      />
      <Card padding="0">
        <Table
          compact
          rowKey="userId"
          columns={[
            { key: "name", label: "Member", render: (r) => (
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.name}</span>
                <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{r.email}</span>
              </span>
            )},
            { key: "since", label: "Member since", mono: true },
            { key: "role", label: "Role", render: (r) => (
              r.userId === data.currentUserId ? (
                <Badge tone="accent">{r.role} · you</Badge>
              ) : (
                <Select
                  options={ROLES}
                  value={r.role}
                  disabled={busy === r.userId}
                  onChange={(e) => setRole(r.userId, e.target.value)}
                  style={{ width: 130 }}
                />
              )
            )},
          ]}
          rows={data.members}
        />
      </Card>
      <p style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
        Access is enforced by row-level security in the database — role changes take effect on the member&apos;s next page load. You can&apos;t change your own role.
      </p>
    </React.Fragment>
  );
}

/* ---------- Integrations ---------- */
function IntegrationsSection({ data }: { data: ConfigData }) {
  const items = [
    {
      name: "Time Doctor",
      icon: "clock",
      connected: data.integrations.timedoctor,
      detail: data.integrations.timedoctor
        ? "Worklogs and breaks sync into attendance."
        : "Set TIMEDOCTOR_API_TOKEN and TIMEDOCTOR_COMPANY_ID to enable worklog sync.",
    },
    {
      name: "Resend (email)",
      icon: "mail",
      connected: data.integrations.resend,
      detail: data.integrations.resend
        ? "Offer and rejection emails deliver via Resend."
        : `Set RESEND_API_KEY to deliver candidate emails${data.integrations.queuedEmails > 0 ? ` — ${data.integrations.queuedEmails} queued` : ""}.`,
    },
    {
      name: "Supabase storage",
      icon: "hard-drive",
      connected: true,
      detail: "Resumes, signed offers, and avatars (tenant-scoped buckets).",
    },
  ];

  return (
    <React.Fragment>
      <SectionHeader title="Integrations" subtitle="Connections are configured through environment variables on the deployment." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
        {items.map((it) => (
          <Card key={it.name}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{
                width: 36, height: 36, borderRadius: "var(--radius-md)", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--accent-subtle)", color: "var(--text-accent)",
              }}>
                <Icon name={it.icon} size={17} />
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{it.name}</span>
                  <Badge tone={it.connected ? "success" : "neutral"} dot>{it.connected ? "Connected" : "Not connected"}</Badge>
                </div>
                <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>{it.detail}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </React.Fragment>
  );
}

/* ---------- API & webhooks ---------- */
function ApiSection({ data }: { data: ConfigData }) {
  return (
    <React.Fragment>
      <SectionHeader title="API & webhooks" subtitle="The same row-level-security rules apply to direct API access." />
      <Card title="REST API">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>Base URL</span>
          <code style={{ font: "var(--data-md)", fontSize: "var(--text-xs)", color: "var(--text-1)", background: "var(--bg-base)", border: "1px solid var(--border-1)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
            {data.restUrl}
          </code>
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
            Authenticate with a user session token; every table is exposed under this URL with the same role-based access as the app. Outbound webhooks are on the backlog.
          </span>
        </div>
      </Card>
    </React.Fragment>
  );
}

/* ---------- Forms (not built) ---------- */
function FormsSection() {
  return (
    <React.Fragment>
      <SectionHeader title="Forms" subtitle="Build data-collection forms (onboarding packets, surveys) from custom fields." />
      <Card>
        <EmptyState
          icon={<Icon name="clipboard-list" size={18} />}
          title="Forms are on the roadmap"
          description="Custom fields (Objects & fields) are the foundation; the form builder comes after — see docs/BACKLOG.md."
        />
      </Card>
    </React.Fragment>
  );
}

export function ConfigStudio({ data }: { data: ConfigData }) {
  const [area, setArea] = React.useState("objects");
  return (
    <Page
      eyebrow="Platform"
      title="Configuration studio"
      actions={<Badge tone="accent">Live</Badge>}
      maxWidth="100%"
    >
      <div style={{ display: "grid", gridTemplateColumns: "208px 1fr", gap: "var(--space-5)", alignItems: "start" }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-1)", borderRadius: "var(--radius-lg)", padding: 8 }}>
          <SideNavSection label="Configure">
            {AREAS.map((a) => (
              <SideNavItem key={a.id} icon={<Icon name={a.icon} size={16} />} label={a.label} active={area === a.id} onClick={() => setArea(a.id)} />
            ))}
          </SideNavSection>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {area === "objects" ? <ObjectsSection data={data} /> : null}
          {area === "forms" ? <FormsSection /> : null}
          {area === "policies" ? <PoliciesSection data={data} /> : null}
          {area === "payrollrules" ? <PayrollRulesSection data={data} /> : null}
          {area === "roles" ? <RolesSection data={data} /> : null}
          {area === "integrations" ? <IntegrationsSection data={data} /> : null}
          {area === "api" ? <ApiSection data={data} /> : null}
        </div>
      </div>
    </Page>
  );
}
