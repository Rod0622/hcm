"use client";

import * as React from "react";

const AVATAR_HUES = ["var(--gold-500)", "#75804b", "#bf5b3e", "var(--violet-500)", "var(--blue-500)", "#6b5a43"];

export function Avatar({
  name = "",
  size = 28,
  src,
  status,
  style,
}: {
  name?: string;
  size?: number;
  src?: string;
  status?: "online" | "away" | "offline";
  style?: React.CSSProperties;
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const bg = AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length];
  const statusColors = { online: "var(--success)", away: "var(--warning)", offline: "var(--gray-400)" };
  return (
    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0, ...style }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <span
          title={name}
          style={{
            width: size, height: size, borderRadius: "50%",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: bg, color: "#fff",
            font: `var(--weight-semibold) ${Math.round(size * 0.36)}px/1 var(--font-sans)`,
            letterSpacing: "0.02em",
          }}
        >
          {initials || "•"}
        </span>
      )}
      {status ? (
        <span style={{
          position: "absolute", right: -1, bottom: -1,
          width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28),
          borderRadius: "50%", background: statusColors[status] || statusColors.offline,
          border: "2px solid var(--bg-surface)",
        }} />
      ) : null}
    </span>
  );
}

export function AvatarStack({ names = [], size = 24, max = 4, style }: { names?: string[]; size?: number; max?: number; style?: React.CSSProperties }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span style={{ display: "inline-flex", ...style }}>
      {shown.map((n, i) => (
        <span key={n + i} style={{ marginLeft: i === 0 ? 0 : -6, borderRadius: "50%", border: "2px solid var(--bg-surface)", display: "inline-flex" }}>
          <Avatar name={n} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span style={{
          marginLeft: -6, width: size + 4, height: size + 4, borderRadius: "50%",
          border: "2px solid var(--bg-surface)", background: "var(--bg-inset)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          font: `var(--weight-medium) var(--text-2xs)/1 var(--font-sans)`, color: "var(--text-2)",
          boxSizing: "border-box",
        }}>+{rest}</span>
      ) : null}
    </span>
  );
}

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export function Badge({ tone = "neutral", dot = false, mono = false, children, style }: {
  tone?: BadgeTone;
  dot?: boolean;
  mono?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const tones: Record<BadgeTone, { bg: string; fg: string; dotc: string }> = {
    neutral: { bg: "var(--bg-inset)", fg: "var(--text-2)", dotc: "var(--gray-400)" },
    accent:  { bg: "var(--accent-subtle)", fg: "var(--text-accent)", dotc: "var(--accent)" },
    success: { bg: "var(--success-subtle)", fg: "var(--success-text)", dotc: "var(--success)" },
    warning: { bg: "var(--warning-subtle)", fg: "var(--warning-text)", dotc: "var(--warning)" },
    danger:  { bg: "var(--danger-subtle)", fg: "var(--danger-text)", dotc: "var(--danger)" },
    info:    { bg: "var(--info-subtle)", fg: "var(--info-text)", dotc: "var(--info)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        height: 20, padding: "0 7px",
        borderRadius: "var(--radius-full)",
        background: t.bg, color: t.fg,
        font: `var(--weight-medium) var(--text-2xs)/1 ${mono ? "var(--font-mono)" : "var(--font-sans)"}`,
        letterSpacing: mono ? 0 : "0.01em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {dot ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dotc, flexShrink: 0 }} /> : null}
      {children}
    </span>
  );
}

export function Card({ title, subtitle, actions = null, padding = "var(--space-5)", children, style }: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  padding?: string | number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-xs)",
        display: "flex", flexDirection: "column",
        ...style,
      }}
    >
      {title || actions ? (
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: `var(--space-4) ${typeof padding === "string" ? padding : padding + "px"} 0`,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            {title ? <h3 style={{ font: "var(--title-card)", color: "var(--text-1)" }}>{title}</h3> : null}
            {subtitle ? <p style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>{subtitle}</p> : null}
          </div>
          {actions ? <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>{actions}</div> : null}
        </header>
      ) : null}
      <div style={{ padding, flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon = null, title, description, action = null, style }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 8, padding: "var(--space-12) var(--space-6)", textAlign: "center", ...style,
    }}>
      {icon ? (
        <div style={{
          width: 36, height: 36, borderRadius: "var(--radius-md)",
          background: "var(--bg-inset)", border: "1px solid var(--border-1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-3)", marginBottom: 4,
        }}>{icon}</div>
      ) : null}
      <h4 style={{ font: "var(--title-card)", color: "var(--text-1)" }}>{title}</h4>
      {description ? <p style={{ font: "var(--body-sm)", color: "var(--text-2)", maxWidth: 360 }}>{description}</p> : null}
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, delta, deltaTone, hint, mono = true, style }: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "success" | "danger" | "neutral";
  hint?: string;
  mono?: boolean;
  style?: React.CSSProperties;
}) {
  const tone = deltaTone || (typeof delta === "string" && delta.trim().startsWith("-") ? "danger" : "success");
  const toneColor = { success: "var(--success-text)", danger: "var(--danger-text)", neutral: "var(--text-3)" }[tone];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, ...style }}>
      <span style={{ font: "var(--label-caps)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</span>
      <span style={{
        font: `var(--weight-semibold) var(--text-2xl)/var(--leading-tight) ${mono ? "var(--font-mono)" : "var(--font-sans)"}`,
        letterSpacing: mono ? "-0.02em" : "var(--tracking-display)",
        color: "var(--text-1)",
        whiteSpace: "nowrap",
      }}>{value}</span>
      {(delta || hint) ? (
        <span style={{ display: "flex", alignItems: "baseline", gap: 6, font: "var(--body-sm)", fontSize: "var(--text-xs)" }}>
          {delta ? <span style={{ color: toneColor, fontWeight: 500 }}>{delta}</span> : null}
          {hint ? <span style={{ color: "var(--text-3)" }}>{hint}</span> : null}
        </span>
      ) : null}
    </div>
  );
}

export type TableColumn<Row> = {
  key: string;
  label: string;
  width?: number | string;
  align?: "left" | "right" | "center";
  mono?: boolean;
  render?: (row: Row) => React.ReactNode;
};

export function Table<Row extends Record<string, unknown>>({ columns = [], rows = [], onRowClick, rowKey, compact = false, style }: {
  columns: TableColumn<Row>[];
  rows: Row[];
  onRowClick?: (row: Row) => void;
  rowKey?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = React.useState<unknown>(null);
  const rowH = compact ? "var(--row-compact)" : "var(--row-default)";
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", font: "var(--body-sm)", ...style }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              style={{
                textAlign: c.align || "left",
                font: "var(--label-caps)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase",
                color: "var(--text-3)", fontWeight: 600,
                padding: "0 var(--space-4)", height: 34,
                borderBottom: "1px solid var(--border-1)",
                width: c.width, whiteSpace: "nowrap",
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const k = rowKey ? row[rowKey] : i;
          return (
            <tr
              key={String(k)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onMouseEnter={() => setHovered(k)}
              onMouseLeave={() => setHovered(null)}
              style={{
                cursor: onRowClick ? "pointer" : "default",
                background: hovered === k && onRowClick ? "var(--bg-hover)" : "transparent",
                transition: "background var(--duration-fast) var(--ease-out)",
              }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: "0 var(--space-4)", height: rowH,
                    borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border-1)",
                    textAlign: c.align || "left",
                    color: "var(--text-1)",
                    font: c.mono ? "var(--data-md)" : "var(--body-sm)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320,
                  }}
                >
                  {c.render ? c.render(row) : (row[c.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
