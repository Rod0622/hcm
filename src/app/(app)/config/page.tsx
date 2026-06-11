"use client";

import * as React from "react";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Table, Input, Select, Switch, Dialog, SideNavItem, SideNavSection } from "@/components/ui";
import { fields } from "@/lib/data";

const AREAS = [
  { id: "objects", label: "Objects & fields", icon: "database" },
  { id: "forms", label: "Forms", icon: "clipboard-list" },
  { id: "policies", label: "Policies", icon: "scale" },
  { id: "payrollrules", label: "Payroll rules", icon: "calculator" },
  { id: "roles", label: "Roles & permissions", icon: "lock-keyhole" },
  { id: "integrations", label: "Integrations", icon: "plug" },
  { id: "api", label: "API & webhooks", icon: "braces" },
];

const TYPE_ICONS: Record<string, string> = { Text: "type", Select: "list", Date: "calendar", Contact: "user", Reference: "link", Boolean: "toggle-left" };

export default function ConfigStudio() {
  const [area, setArea] = React.useState("objects");
  const [adding, setAdding] = React.useState(false);
  return (
    <Page
      eyebrow="Platform"
      title="Configuration studio"
      actions={<Badge tone="accent">Sandbox</Badge>}
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
          {area === "objects" ? (
            <React.Fragment>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ font: "var(--title-section)", color: "var(--text-1)" }}>Custom fields</h1>
                  <p style={{ font: "var(--body-sm)", color: "var(--text-3)", marginTop: 2 }}>Every object supports custom fields. Changes are versioned and effective-dated.</p>
                </div>
                <Select options={["Employee", "Worker", "Position", "Legal entity"]} style={{ width: 150 }} />
                <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setAdding(true)}>Add field</Button>
              </div>
              <Card padding="0">
                <Table
                  compact
                  rowKey="key"
                  onRowClick={() => {}}
                  columns={[
                    { key: "name", label: "Field", render: (r) => <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name={TYPE_ICONS[r.type] || "type"} size={14} color="var(--text-3)" />{r.name}</span> },
                    { key: "key", label: "Key", mono: true },
                    { key: "type", label: "Type", render: (r) => <Badge tone="neutral">{r.type}</Badge> },
                    { key: "object", label: "Object" },
                    { key: "required", label: "Required" },
                    { key: "visibility", label: "Visible to" },
                  ]}
                  rows={fields}
                />
              </Card>
            </React.Fragment>
          ) : (
            <Card>
              <p style={{ font: "var(--body-sm)", color: "var(--text-3)" }}>
                {AREAS.find((a) => a.id === area)!.label} is on the roadmap — see docs/BACKLOG.md for sequencing.
              </p>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add field"
        description="Added to the Employee object in the sandbox environment."
        footer={
          <React.Fragment>
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setAdding(false)}>Add field</Button>
          </React.Fragment>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Field name" placeholder="e.g. Certification expiry" />
          <Select label="Type" options={["Text", "Select", "Date", "Number", "Boolean", "Contact", "Reference"]} />
          <Select label="Visible to" options={["Everyone", "HR only", "Finance", "Manager chain"]} />
          <Switch label="Required" />
        </div>
      </Dialog>
    </Page>
  );
}
