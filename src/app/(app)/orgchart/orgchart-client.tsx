"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Avatar, Input, SegmentedControl, IconButton, EmptyState } from "@/components/ui";

export type OrgNode = {
  id: string;
  managerId: string | null;
  name: string;
  avatarSrc: string | null;
  title: string;
  dept: string;
  location: string;
  status: string;
};

type TreeNode = OrgNode & { children: TreeNode[] };

function buildTree(nodes: OrgNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(nodes.map((n) => [n.id, { ...n, children: [] }]));
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.managerId ? byId.get(node.managerId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

function findNode(roots: TreeNode[], id: string): TreeNode | null {
  for (const r of roots) {
    if (r.id === id) return r;
    const hit = findNode(r.children, id);
    if (hit) return hit;
  }
  return null;
}

function ancestorsOf(nodes: OrgNode[], id: string): OrgNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const chain: OrgNode[] = [];
  let current = byId.get(id)?.managerId;
  while (current) {
    const node = byId.get(current);
    if (!node || chain.some((c) => c.id === node.id)) break;
    chain.unshift(node);
    current = node.managerId;
  }
  return chain;
}

function NodeCard({ node, highlighted, collapsed, onToggle, onFocus }: {
  node: TreeNode;
  highlighted: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onFocus: () => void;
}) {
  const router = useRouter();
  const reports = node.children.length;
  const total = countDescendants(node);
  return (
    <div
      onClick={reports > 0 ? onFocus : () => router.push(`/employees/${node.id}`)}
      style={{
        width: 212,
        display: "flex", flexDirection: "column", gap: 8,
        padding: "12px 14px",
        background: "var(--bg-surface)",
        border: `1px solid ${highlighted ? "var(--border-focus)" : "var(--border-1)"}`,
        boxShadow: highlighted ? "var(--shadow-focus)" : "var(--shadow-xs)",
        borderRadius: "var(--radius-lg)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={node.name} size={32} src={node.avatarSrc ?? undefined} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {node.name}
          </span>
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {node.title}
          </span>
        </div>
        <span onClick={(e) => e.stopPropagation()}>
          <IconButton label="View profile" onClick={() => router.push(`/employees/${node.id}`)}>
            <Icon name="user" size={14} />
          </IconButton>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Badge tone="neutral">{node.dept}</Badge>
        <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{node.location}</span>
        <span style={{ flex: 1 }} />
        {reports > 0 ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              border: "1px solid var(--border-1)", borderRadius: "var(--radius-pill)",
              background: "var(--bg-base)", color: "var(--text-2)",
              font: "var(--weight-medium) var(--text-2xs)/1 var(--font-sans)",
              padding: "4px 8px", cursor: "pointer",
            }}
          >
            <Icon name={collapsed ? "chevron-down" : "chevron-up"} size={11} />
            {total} report{total === 1 ? "" : "s"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TreeBranch({ node, collapsedSet, highlightIds, onToggle, onFocus }: {
  node: TreeNode;
  collapsedSet: Set<string>;
  highlightIds: Set<string>;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const collapsed = collapsedSet.has(node.id);
  return (
    <li>
      <NodeCard
        node={node}
        highlighted={highlightIds.has(node.id)}
        collapsed={collapsed}
        onToggle={() => onToggle(node.id)}
        onFocus={() => onFocus(node.id)}
      />
      {node.children.length > 0 && !collapsed ? (
        <ul>
          {node.children.map((c) => (
            <TreeBranch key={c.id} node={c} collapsedSet={collapsedSet} highlightIds={highlightIds} onToggle={onToggle} onFocus={onFocus} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Departments({ nodes, query }: { nodes: OrgNode[]; query: string }) {
  const router = useRouter();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const q = query.toLowerCase();
  const filtered = nodes.filter((n) => !q || [n.name, n.title, n.dept].some((v) => v.toLowerCase().includes(q)));
  const depts = Array.from(new Set(filtered.map((n) => n.dept))).sort();

  if (depts.length === 0) {
    return <EmptyState icon={<Icon name="users" size={18} />} title="No matches" description="Try a different search." />;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
      {depts.map((dept) => {
        const members = filtered.filter((n) => n.dept === dept);
        return (
          <Card key={dept} title={dept} subtitle={`${members.length} member${members.length === 1 ? "" : "s"}`} padding="0">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {members.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => router.push(`/employees/${m.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                    padding: "9px 20px", background: "transparent", border: "none", cursor: "pointer",
                    borderBottom: i === members.length - 1 ? "none" : "1px solid var(--border-1)",
                  }}
                >
                  <Avatar name={m.name} size={26} src={m.avatarSrc ?? undefined} />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{m.name}</span>
                    <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{m.title}</span>
                  </span>
                  <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>
                    {m.managerId ? `→ ${byId.get(m.managerId)?.name ?? ""}` : "Top level"}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function OrgChart({ nodes }: { nodes: OrgNode[] }) {
  const [view, setView] = React.useState("hierarchy");
  const [query, setQuery] = React.useState("");
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const roots = React.useMemo(() => buildTree(nodes), [nodes]);
  const q = query.toLowerCase();
  const highlightIds = React.useMemo(
    () => new Set(q ? nodes.filter((n) => [n.name, n.title, n.dept].some((v) => v.toLowerCase().includes(q))).map((n) => n.id) : []),
    [nodes, q]
  );

  const focusNode = focusId ? findNode(roots, focusId) : null;
  const visibleRoots = focusNode ? [focusNode] : roots;
  const breadcrumb = focusId ? ancestorsOf(nodes, focusId) : [];

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const managers = nodes.filter((n) => nodes.some((m) => m.managerId === n.id)).length;
  const depts = new Set(nodes.map((n) => n.dept)).size;

  return (
    <Page
      eyebrow="Workforce"
      title="Org chart"
      actions={
        <SegmentedControl
          options={[
            { value: "hierarchy", label: "Hierarchy" },
            { value: "departments", label: "Departments" },
          ]}
          value={view}
          onChange={setView}
        />
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Input
            placeholder="Search name, title, department…"
            prefix={<Icon name="search" size={14} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 300 }}
          />
          <span style={{ flex: 1 }} />
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
            {nodes.length} employees · {depts} departments · {managers} managers
          </span>
        </div>

        {view === "departments" ? (
          <Departments nodes={nodes} query={query} />
        ) : (
          <React.Fragment>
            {focusNode ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Button variant="secondary" size="sm" icon={<Icon name="arrow-left" size={13} />} onClick={() => setFocusId(null)}>
                  Full organization
                </Button>
                {breadcrumb.map((b) => (
                  <Button key={b.id} variant="ghost" size="sm" onClick={() => setFocusId(b.id)}>{b.name}</Button>
                ))}
                <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
                  / {focusNode.name} — {countDescendants(focusNode)} report{countDescendants(focusNode) === 1 ? "" : "s"}
                </span>
              </div>
            ) : (
              <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
                Click a manager to focus their team · use the pill to collapse a branch
              </span>
            )}
            <Card padding="0">
              <div className="orgtree" style={{ overflowX: "auto", padding: "var(--space-6) var(--space-4)" }}>
                <ul>
                  {visibleRoots.map((r) => (
                    <TreeBranch
                      key={r.id}
                      node={r}
                      collapsedSet={collapsed}
                      highlightIds={highlightIds}
                      onToggle={toggle}
                      onFocus={setFocusId}
                    />
                  ))}
                </ul>
              </div>
            </Card>
          </React.Fragment>
        )}
      </div>
    </Page>
  );
}
