"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, SideNavItem, SideNavSection, Avatar, IconButton, EmptyState } from "@/components/ui";
import { user } from "@/lib/data";

const NAV: Array<{ section: string; items: Array<{ href: string; label: string; icon: string; count?: number }> }> = [
  { section: "", items: [
    { href: "/dashboard", label: "Home", icon: "house" },
    { href: "/inbox", label: "Inbox", icon: "inbox", count: 4 },
  ]},
  { section: "Workforce", items: [
    { href: "/employees", label: "Employees", icon: "users", count: 142 },
    { href: "/recruiting", label: "Recruiting", icon: "briefcase" },
    { href: "/orgchart", label: "Org chart", icon: "git-fork" },
    { href: "/entities", label: "Legal entities", icon: "building-2", count: 3 },
  ]},
  { section: "Operations", items: [
    { href: "/payroll", label: "Payroll", icon: "banknote" },
    { href: "/compliance", label: "Compliance", icon: "shield-check", count: 3 },
    { href: "/time", label: "Time & leave", icon: "clock" },
  ]},
  { section: "Platform", items: [
    { href: "/workflows", label: "Workflows", icon: "workflow" },
    { href: "/analytics", label: "Analytics", icon: "chart-no-axes-column" },
    { href: "/config", label: "Configuration", icon: "settings-2" },
  ]},
];

type Theme = "light" | "warm" | "dark";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setThemeRaw] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("tnk-theme")) as Theme | null;
    const initial = stored || "dark";
    setThemeRaw(initial);
    document.documentElement.setAttribute("data-theme", initial);
    return () => { document.documentElement.removeAttribute("data-theme"); };
  }, []);

  const setTheme = (t: Theme) => {
    setThemeRaw(t);
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("tnk-theme", t); } catch {}
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <aside style={{
        width: "var(--sidebar-width)", flexShrink: 0,
        borderRight: "1px solid var(--border-1)",
        background: "var(--bg-surface)",
        display: "flex", flexDirection: "column", padding: "12px 10px",
        gap: 2, overflowY: "auto",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px 14px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={theme === "dark" ? "/logotype-white.png" : "/logotype-black.png"}
            alt="Tenkara"
            style={{ height: 18, width: "auto" }}
          />
        </Link>
        <button type="button" style={{
          display: "flex", alignItems: "center", gap: 8, height: 30, padding: "0 8px",
          borderRadius: "var(--radius-md)", border: "1px solid var(--border-1)",
          background: "var(--bg-base)", color: "var(--text-3)",
          font: "var(--weight-regular) var(--text-sm)/1 var(--font-sans)", cursor: "pointer", marginBottom: 8,
        }}>
          <Icon name="search" size={14} />
          <span style={{ flex: 1, textAlign: "left" }}>Search</span>
          <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)", border: "1px solid var(--border-1)", borderRadius: 4, padding: "3px 4px" }}>⌘K</span>
        </button>
        {NAV.map((group, gi) => (
          <SideNavSection key={gi} label={group.section || undefined}>
            {group.items.map((it) => (
              <SideNavItem
                key={it.href}
                icon={<Icon name={it.icon} size={16} />}
                label={it.label}
                count={it.count}
                active={pathname === it.href || pathname.startsWith(it.href + "/")}
                onClick={() => router.push(it.href)}
              />
            ))}
          </SideNavSection>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 1 }}>
          <SideNavItem
            icon={<Icon name="sparkles" size={16} />}
            label="Ask Tenkara"
            active={pathname === "/ai"}
            onClick={() => router.push("/ai")}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 2px" }}>
            <Avatar name={user.name} size={24} status="online" />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</span>
              <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>Admin</span>
            </div>
            <IconButton
              label={`Theme: ${theme} — click to switch`}
              onClick={() => {
                const order: Theme[] = ["light", "warm", "dark"];
                setTheme(order[(order.indexOf(theme) + 1) % order.length]);
              }}
            >
              <Icon name={theme === "dark" ? "moon" : theme === "warm" ? "sunset" : "sun"} size={15} />
            </IconButton>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </main>
    </div>
  );
}

/* Standard page chrome: 52px topbar with title + actions, scrollable body. */
export function Page({ title, eyebrow, actions, children, maxWidth = "var(--page-max-width)" }: {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <React.Fragment>
      <header style={{
        height: "var(--topbar-height)", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 var(--page-gutter)",
        borderBottom: "1px solid var(--border-1)",
        background: "var(--bg-surface)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flex: 1, minWidth: 0 }}>
          {eyebrow ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>{eyebrow} /</span> : null}
          <span style={{ font: "var(--weight-semibold) var(--text-md)/1 var(--font-sans)", color: "var(--text-1)" }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div>
      </header>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth, margin: "0 auto", padding: "var(--space-6) var(--page-gutter) var(--space-12)" }}>
          {children}
        </div>
      </div>
    </React.Fragment>
  );
}

export function NotBuilt({ name }: { name: string }) {
  return (
    <Page title={name}>
      <EmptyState
        icon={<Icon name="square-dashed" size={18} />}
        title={`${name} is on the roadmap`}
        description="This surface exists in the product plan but has not been built yet. See docs/BACKLOG.md for sequencing."
      />
    </Page>
  );
}
