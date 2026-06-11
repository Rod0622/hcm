"use client";

import * as React from "react";

export function Breadcrumb({ items = [], style }: {
  items?: Array<string | { label: string; href?: string; onClick?: () => void }>;
  style?: React.CSSProperties;
}) {
  return (
    <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--body-sm)", fontSize: "var(--text-xs)", ...style }}>
      {items.map((raw, i) => {
        const it = typeof raw === "string" ? { label: raw } : raw;
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 ? <span style={{ color: "var(--text-3)" }}>/</span> : null}
            {last ? (
              <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{it.label}</span>
            ) : (
              <a
                href={it.href || "#"}
                onClick={it.onClick ? (e) => { e.preventDefault(); it.onClick!(); } : undefined}
                style={{ color: "var(--text-3)", textDecoration: "none" }}
              >
                {it.label}
              </a>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function SideNavItem({ icon = null, label, active = false, count, onClick, indent = false, style }: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  indent?: boolean;
  style?: React.CSSProperties;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9, width: "100%",
        height: 30, padding: indent ? "0 8px 0 30px" : "0 8px",
        borderRadius: "var(--radius-sm)", border: "none", textAlign: "left",
        background: active ? "var(--bg-active)" : hover ? "var(--bg-hover)" : "transparent",
        color: active ? "var(--text-1)" : "var(--text-2)",
        font: `var(--weight-${active ? "medium" : "regular"}) var(--text-sm)/1 var(--font-sans)`,
        cursor: "pointer",
        transition: "background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)",
        ...style,
      }}
    >
      {icon ? <span style={{ display: "inline-flex", color: active ? "var(--text-1)" : "var(--text-3)" }}>{icon}</span> : null}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {count !== undefined ? (
        <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)", color: "var(--text-3)" }}>{count}</span>
      ) : null}
    </button>
  );
}

export function SideNavSection({ label, children, style }: { label?: string; children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, ...style }}>
      {label ? (
        <span style={{
          font: "var(--label-caps)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase",
          color: "var(--text-3)", padding: "14px 8px 6px",
        }}>{label}</span>
      ) : null}
      {children}
    </div>
  );
}

export type Tab = { value: string; label: string; count?: number };

export function Tabs({ tabs = [], value, defaultValue, onChange, style }: {
  tabs: Array<string | Tab>;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}) {
  const norm: Tab[] = tabs.map((t) => (typeof t === "string" ? { value: t, label: t } : t));
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue !== undefined ? defaultValue : norm[0] && norm[0].value);
  const current = isControlled ? value : internal;
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-1)", ...style }}>
      {norm.map((t) => {
        const active = t.value === current;
        return (
          <TabButton key={t.value} active={active} onClick={() => { if (!isControlled) setInternal(t.value); if (onChange) onChange(t.value); }}>
            {t.label}
            {t.count !== undefined ? (
              <span style={{
                font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)",
                background: active ? "var(--accent-subtle)" : "var(--bg-inset)",
                color: active ? "var(--text-accent)" : "var(--text-3)",
                borderRadius: "var(--radius-full)", padding: "3px 6px",
              }}>{t.count}</span>
            ) : null}
          </TabButton>
        );
      })}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "0 4px 10px", marginBottom: -1, border: "none", background: "transparent",
        borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
        color: active ? "var(--text-1)" : hover ? "var(--text-1)" : "var(--text-2)",
        font: "var(--weight-medium) var(--text-sm)/1 var(--font-sans)",
        cursor: "pointer", marginRight: 12,
        transition: "color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)",
      }}
    >
      {children}
    </button>
  );
}
