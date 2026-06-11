"use client";

import * as React from "react";

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  style?: React.CSSProperties;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style" | "onClick">;

export function Button({
  variant = "primary",
  size = "md",
  icon = null,
  disabled = false,
  loading = false,
  children,
  onClick,
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const heights = { sm: "var(--control-sm)", md: "var(--control-md)", lg: "var(--control-lg)" };
  const pads = { sm: "0 10px", md: "0 12px", lg: "0 16px" };
  const fonts = { sm: "var(--text-xs)", md: "var(--text-sm)", lg: "var(--text-md)" };

  const variants: Record<string, { base: React.CSSProperties; hover: React.CSSProperties }> = {
    primary: {
      base: { background: "var(--accent)", color: "var(--text-on-accent)", border: "1px solid transparent" },
      hover: { background: "var(--accent-hover)" },
    },
    secondary: {
      base: { background: "var(--bg-surface)", color: "var(--text-1)", border: "1px solid var(--border-1)", boxShadow: "var(--shadow-xs)" },
      hover: { background: "var(--bg-hover)" },
    },
    ghost: {
      base: { background: "transparent", color: "var(--text-2)", border: "1px solid transparent" },
      hover: { background: "var(--bg-hover)", color: "var(--text-1)" },
    },
    danger: {
      base: { background: "var(--danger)", color: "#fff", border: "1px solid transparent" },
      hover: { filter: "brightness(0.92)" },
    },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: heights[size],
        padding: pads[size],
        borderRadius: "var(--radius-md)",
        font: `var(--weight-medium) ${fonts[size]}/1 var(--font-sans)`,
        letterSpacing: "var(--tracking-normal)",
        cursor: disabled || loading ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
        whiteSpace: "nowrap",
        ...v.base,
        ...(hover && !disabled && !loading ? v.hover : null),
        ...(active && !disabled && !loading ? { filter: "brightness(0.94)" } : null),
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 12, height: 12, borderRadius: "50%",
        border: "1.5px solid currentColor", borderTopColor: "transparent",
        animation: "tnk-spin 0.7s linear infinite", display: "inline-block",
      }}
    />
  );
}

type IconButtonProps = {
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline";
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  style?: React.CSSProperties;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style" | "onClick">;

export function IconButton({ label, size = "md", variant = "ghost", disabled = false, children, onClick, style, ...rest }: IconButtonProps) {
  const [hover, setHover] = React.useState(false);
  const dims = { sm: 24, md: 28, lg: 32 };
  const variants: Record<string, { base: React.CSSProperties; hover: React.CSSProperties }> = {
    ghost: { base: { background: "transparent", border: "1px solid transparent", color: "var(--text-2)" }, hover: { background: "var(--bg-hover)", color: "var(--text-1)" } },
    outline: { base: { background: "var(--bg-surface)", border: "1px solid var(--border-1)", color: "var(--text-2)", boxShadow: "var(--shadow-xs)" }, hover: { background: "var(--bg-hover)", color: "var(--text-1)" } },
  };
  const v = variants[variant] || variants.ghost;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: dims[size], height: dims[size],
        borderRadius: "var(--radius-sm)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)",
        ...v.base,
        ...(hover && !disabled ? v.hover : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
