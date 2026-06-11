import * as React from "react";
import { icons } from "lucide-react";

/* Renders a Lucide icon by kebab-case id, e.g. "users", "circle-check". */
export function Icon({
  name,
  size = 16,
  strokeWidth = 1.5,
  color,
  style,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  const pascal = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Lucide = icons[pascal as keyof typeof icons];
  if (!Lucide) return null;
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", width: size, height: size, flexShrink: 0, color: color || "currentColor", ...style }}
    >
      <Lucide size={size} strokeWidth={strokeWidth} />
    </span>
  );
}
