"use client";

import * as React from "react";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Avatar, Table, Tabs, IconButton, Stat } from "@/components/ui";
import { profile as P } from "@/lib/data";

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ font: "var(--label-caps)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>{k}</span>
      <span style={{ font: mono ? "var(--data-md)" : "var(--body-sm)", color: "var(--text-1)" }}>{v}</span>
    </div>
  );
}

function Overview() {
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
          <KV k="Employee ID" v={P.id} mono />
          <KV k="Work email" v={P.email} mono />
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Card title="Compensation" actions={<IconButton label="Audit history"><Icon name="history" size={15} /></IconButton>}>
          <div style={{ display: "flex", gap: 40 }}>
            <Stat label="Base salary" value={P.salary} hint={P.currency} />
            <Stat label="Level" value={P.level} mono={false} />
            <Stat label="Equity" value={P.equity} />
          </div>
        </Card>
        <Card title="Recent activity" padding="0">
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
        </Card>
      </div>
    </div>
  );
}

function Documents() {
  return (
    <Card title="Documents" subtitle={`${P.documents.length} on file`} padding="0" actions={<Button size="sm" variant="secondary" icon={<Icon name="plus" size={14} />}>Request document</Button>}>
      <Table
        rowKey="name"
        onRowClick={() => {}}
        columns={[
          { key: "name", label: "Document", render: (r) => <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="file-text" size={15} color="var(--text-3)" />{r.name}</span> },
          { key: "kind", label: "Type" },
          { key: "date", label: "Date", mono: true },
          { key: "status", label: "Status", render: (r) => <Badge tone={r.tone} dot>{r.status}</Badge> },
        ]}
        rows={P.documents}
      />
    </Card>
  );
}

function Devices() {
  return (
    <Card title="Devices & access" subtitle="Managed by IT automation" padding="0">
      <Table
        rowKey="id"
        columns={[
          { key: "name", label: "Device", render: (r) => <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="laptop" size={15} color="var(--text-3)" />{r.name}</span> },
          { key: "id", label: "Asset ID", mono: true },
          { key: "assigned", label: "Assigned", mono: true },
          { key: "status", label: "Status", render: (r) => <Badge tone={r.tone} dot>{r.status}</Badge> },
        ]}
        rows={P.devices}
      />
    </Card>
  );
}

function Compensation() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Card>
        <div style={{ display: "flex", gap: 40 }}>
          <Stat label="Base salary" value={P.salary} hint={P.currency} />
          <Stat label="Equity" value={P.equity} />
          <Stat label="Pay group" value="US Semi-monthly" mono={false} />
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

export default function EmployeeProfile() {
  const [tab, setTab] = React.useState("overview");
  return (
    <Page
      eyebrow="Employees"
      title={P.name}
      actions={
        <React.Fragment>
          <Button variant="secondary" size="sm" icon={<Icon name="workflow" size={14} />}>Start workflow</Button>
          <Button variant="primary" size="sm" icon={<Icon name="pencil" size={13} />}>Edit profile</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={P.name} size={56} status="online" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ font: "var(--title-page)", color: "var(--text-1)" }}>{P.name}</h1>
              <Badge tone="success" dot>Active</Badge>
              <Badge tone="neutral" mono>{P.id}</Badge>
            </div>
            <span style={{ font: "var(--body-sm)", color: "var(--text-2)" }}>{P.role} · {P.dept} · {P.location}</span>
          </div>
        </div>
        <Tabs
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "comp", label: "Compensation" },
            { value: "docs", label: "Documents", count: P.documents.length },
            { value: "devices", label: "Devices", count: P.devices.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "overview" ? <Overview /> : null}
        {tab === "comp" ? <Compensation /> : null}
        {tab === "docs" ? <Documents /> : null}
        {tab === "devices" ? <Devices /> : null}
      </div>
    </Page>
  );
}
