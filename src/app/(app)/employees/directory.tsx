"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Avatar, Table, Input, Select, EmptyState, type BadgeTone } from "@/components/ui";

export type DirectoryRow = {
  id: string;
  number: string;
  name: string;
  role: string;
  dept: string;
  location: string;
  entity: string;
  manager: string;
  start: string;
  status: string;
  tone: BadgeTone;
};

export function Directory({ rows }: { rows: DirectoryRow[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [dept, setDept] = React.useState("All departments");

  const depts = ["All departments", ...Array.from(new Set(rows.map((e) => e.dept)))];
  const filtered = rows.filter((e) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || [e.name, e.role, e.dept, e.location, e.number].some((v) => v.toLowerCase().includes(q));
    const matchesDept = dept === "All departments" || e.dept === dept;
    return matchesQuery && matchesDept;
  });

  return (
    <Page
      eyebrow="Workforce"
      title="Employees"
      actions={
        <React.Fragment>
          <Button variant="secondary" size="sm" icon={<Icon name="download" size={14} />}>Export</Button>
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />}>Add employee</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Input
            placeholder="Search by name, role, location…"
            prefix={<Icon name="search" size={14} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 320 }}
          />
          <Select options={depts} value={dept} onChange={(e) => setDept(e.target.value)} style={{ width: 180 }} />
          <span style={{ flex: 1 }} />
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
            {filtered.length} of {rows.length} employees
          </span>
        </div>

        <Card padding="0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Icon name="users" size={18} />}
              title="No employees match"
              description="Try a different search or clear the department filter."
              action={<Button variant="secondary" size="sm" onClick={() => { setQuery(""); setDept("All departments"); }}>Clear filters</Button>}
            />
          ) : (
            <Table
              rowKey="id"
              onRowClick={(r) => router.push(`/employees/${r.id}`)}
              columns={[
                { key: "name", label: "Employee", render: (r) => (
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={r.name} size={26} />
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.name}</span>
                      <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{r.role}</span>
                    </span>
                  </span>
                )},
                { key: "number", label: "ID", mono: true },
                { key: "dept", label: "Department" },
                { key: "location", label: "Location" },
                { key: "entity", label: "Legal entity" },
                { key: "manager", label: "Manager" },
                { key: "start", label: "Start", mono: true },
                { key: "status", label: "Status", render: (r) => <Badge tone={r.tone} dot>{r.status}</Badge> },
              ]}
              rows={filtered}
            />
          )}
        </Card>
      </div>
    </Page>
  );
}
