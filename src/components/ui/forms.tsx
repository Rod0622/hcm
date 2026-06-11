"use client";

import * as React from "react";

type InputProps = {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  mono?: boolean;
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "style" | "size" | "prefix">;

export function Input({ label, hint, error, prefix = null, suffix = null, mono = false, size = "md", style, ...rest }: InputProps) {
  const [focus, setFocus] = React.useState(false);
  const heights = { sm: "var(--control-sm)", md: "var(--control-md)", lg: "var(--control-lg)" };
  const border = error ? "var(--danger)" : focus ? "var(--border-focus)" : "var(--border-1)";
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, font: "var(--label-md)", color: "var(--text-1)", ...style }}>
      {label ? <span>{label}</span> : null}
      <span
        style={{
          display: "flex", alignItems: "center", gap: 8,
          height: heights[size],
          padding: "0 10px",
          background: "var(--bg-surface)",
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-md)",
          boxShadow: focus ? "var(--shadow-focus)" : "var(--shadow-xs)",
          transition: "border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
        }}
      >
        {prefix ? <span style={{ color: "var(--text-3)", display: "inline-flex" }}>{prefix}</span> : null}
        <input
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
            font: mono ? "var(--data-md)" : "var(--body-sm)",
            color: "var(--text-1)", padding: 0, boxShadow: "none",
          }}
          {...rest}
        />
        {suffix ? <span style={{ color: "var(--text-3)", display: "inline-flex", font: "var(--body-sm)" }}>{suffix}</span> : null}
      </span>
      {error ? (
        <span style={{ font: "var(--body-sm)", color: "var(--danger-text)", fontSize: "var(--text-xs)" }}>{error}</span>
      ) : hint ? (
        <span style={{ font: "var(--body-sm)", color: "var(--text-3)", fontSize: "var(--text-xs)", fontWeight: 400 }}>{hint}</span>
      ) : null}
    </label>
  );
}

type SelectOption = string | { value: string; label: string };

type SelectProps = {
  label?: string;
  options?: SelectOption[];
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  style?: React.CSSProperties;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "style" | "size">;

export function Select({ label, options = [], value, onChange, size = "md", disabled = false, style, ...rest }: SelectProps) {
  const [focus, setFocus] = React.useState(false);
  const heights = { sm: "var(--control-sm)", md: "var(--control-md)", lg: "var(--control-lg)" };
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, font: "var(--label-md)", color: "var(--text-1)", ...style }}>
      {label ? <span>{label}</span> : null}
      <span style={{ position: "relative", display: "flex" }}>
        <select
          value={value}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            appearance: "none", WebkitAppearance: "none",
            width: "100%", height: heights[size],
            padding: "0 28px 0 10px",
            background: "var(--bg-surface)",
            border: `1px solid ${focus ? "var(--border-focus)" : "var(--border-1)"}`,
            borderRadius: "var(--radius-md)",
            boxShadow: focus ? "var(--shadow-focus)" : "var(--shadow-xs)",
            font: "var(--body-sm)", color: "var(--text-1)",
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.5 : 1, outline: "none",
            transition: "border-color var(--duration-fast) var(--ease-out)",
          }}
          {...rest}
        >
          {options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <svg viewBox="0 0 16 16" width="14" height="14" style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-3)" }}>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}

type SwitchProps = {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (on: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
};

export function Switch({ label, checked, defaultChecked = false, onChange, disabled = false, style }: SwitchProps) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked);
  const on = isControlled ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    if (!isControlled) setInternal(!on);
    if (onChange) onChange(!on);
  };
  return (
    <label
      onClick={(e) => { e.preventDefault(); toggle(); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, font: "var(--body-sm)", color: "var(--text-1)", userSelect: "none", ...style }}
    >
      <span
        role="switch"
        aria-checked={on}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } }}
        style={{
          width: 30, height: 18, borderRadius: "var(--radius-full)",
          background: on ? "var(--accent)" : "var(--border-2)",
          position: "relative", flexShrink: 0,
          transition: "background var(--duration-base) var(--ease-out)",
        }}
      >
        <span
          style={{
            position: "absolute", top: 2, left: on ? 14 : 2,
            width: 14, height: 14, borderRadius: "50%",
            background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            transition: "left var(--duration-base) var(--ease-out)",
          }}
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}

type CheckboxProps = {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (on: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
};

export function Checkbox({ label, checked, defaultChecked = false, onChange, disabled = false, style }: CheckboxProps) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked);
  const on = isControlled ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    if (!isControlled) setInternal(!on);
    if (onChange) onChange(!on);
  };
  return (
    <label
      onClick={(e) => { e.preventDefault(); toggle(); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, font: "var(--body-sm)", color: "var(--text-1)", userSelect: "none", ...style }}
    >
      <span
        role="checkbox"
        aria-checked={on}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } }}
        style={{
          width: 16, height: 16, borderRadius: "var(--radius-xs)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: on ? "var(--accent)" : "var(--bg-surface)",
          border: `1px solid ${on ? "var(--accent)" : "var(--border-2)"}`,
          transition: "background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)",
          flexShrink: 0,
        }}
      >
        {on ? (
          <svg viewBox="0 0 16 16" width="11" height="11">
            <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}

type SegmentedControlProps = {
  options?: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md";
  style?: React.CSSProperties;
};

export function SegmentedControl({ options = [], value, defaultValue, onChange, size = "md", style }: SegmentedControlProps) {
  const isControlled = value !== undefined;
  const first = options[0];
  const [internal, setInternal] = React.useState(
    defaultValue !== undefined ? defaultValue : typeof first === "string" ? first : first && first.value
  );
  const current = isControlled ? value : internal;
  const heights = { sm: 24, md: 28 };
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex", gap: 2, padding: 2,
        background: "var(--bg-inset)",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--radius-md)",
        ...style,
      }}
    >
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => { if (!isControlled) setInternal(opt.value); if (onChange) onChange(opt.value); }}
            style={{
              height: heights[size], padding: "0 10px",
              borderRadius: "var(--radius-sm)", border: "none",
              background: active ? "var(--bg-surface)" : "transparent",
              boxShadow: active ? "var(--shadow-xs)" : "none",
              color: active ? "var(--text-1)" : "var(--text-2)",
              font: `var(--weight-medium) var(--text-xs)/1 var(--font-sans)`,
              cursor: "pointer",
              transition: "background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
