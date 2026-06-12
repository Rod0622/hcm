"use client";

import * as React from "react";

export function Banner({ tone = "info", title, description, action = null, style }: {
  tone?: "info" | "warning" | "danger" | "success";
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const tones = {
    info:    { border: "var(--info)", bg: "var(--info-subtle)", fg: "var(--info-text)" },
    warning: { border: "var(--warning)", bg: "var(--warning-subtle)", fg: "var(--warning-text)" },
    danger:  { border: "var(--danger)", bg: "var(--danger-subtle)", fg: "var(--danger-text)" },
    success: { border: "var(--success)", bg: "var(--success-subtle)", fg: "var(--success-text)" },
  };
  const t = tones[tone] || tones.info;
  return (
    <div
      role="alert"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px",
        background: t.bg,
        border: `1px solid color-mix(in srgb, ${t.border} 35%, transparent)`,
        borderRadius: "var(--radius-md)",
        ...style,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.border, flexShrink: 0 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: 1, flexWrap: "wrap", minWidth: 0 }}>
        <span style={{ font: "var(--label-md)", color: t.fg }}>{title}</span>
        {description ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>{description}</span> : null}
      </div>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </div>
  );
}

export function Dialog({ open, title, description, onClose, footer = null, width = 440, children, style }: {
  open: boolean;
  title: string;
  description?: string;
  onClose?: () => void;
  footer?: React.ReactNode;
  width?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "var(--bg-overlay)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
        animation: "tnk-fade var(--duration-base) var(--ease-out)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: "calc(100vw - 48px)",
          maxHeight: "82vh",
          display: "flex", flexDirection: "column",
          background: "var(--bg-raised)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          animation: "tnk-pop var(--duration-base) var(--ease-out)",
          ...style,
        }}
      >
        <header style={{ flexShrink: 0, padding: "var(--space-5) var(--space-5) 0", display: "flex", flexDirection: "column", gap: 4 }}>
          <h3 style={{ font: "var(--title-section)", color: "var(--text-1)" }}>{title}</h3>
          {description ? <p style={{ font: "var(--body-sm)", color: "var(--text-2)" }}>{description}</p> : null}
        </header>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "var(--space-4) var(--space-5)" }}>{children}</div>
        {footer ? (
          <footer style={{
            flexShrink: 0,
            display: "flex", justifyContent: "flex-end", gap: 8,
            padding: "var(--space-3) var(--space-5)",
            borderTop: "1px solid var(--border-1)",
          }}>{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
