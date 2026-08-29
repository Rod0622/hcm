"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, SideNavItem, SideNavSection, Avatar, IconButton, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const NAV: Array<{ section: string; items: Array<{ href: string; label: string; icon: string; count?: number; adminOnly?: boolean; ownerOnly?: boolean }> }> = [
  { section: "", items: [
    { href: "/dashboard", label: "Home", icon: "house" },
    { href: "/inbox", label: "Inbox", icon: "inbox" },
  ]},
  { section: "Workforce", items: [
    { href: "/employees", label: "Employees", icon: "users" },
    { href: "/recruiting", label: "Recruiting", icon: "briefcase", adminOnly: true },
    { href: "/performance", label: "Performance", icon: "target" },
    { href: "/orgchart", label: "Org chart", icon: "git-fork" },
    { href: "/entities", label: "Legal entities", icon: "building-2", adminOnly: true },
  ]},
  { section: "Operations", items: [
    { href: "/payroll", label: "Payroll", icon: "banknote" },
    { href: "/compliance", label: "Compliance", icon: "shield-check", adminOnly: true },
    { href: "/time", label: "Time & leave", icon: "clock" },
    { href: "/requests", label: "Requests", icon: "file-text" },
  ]},
  { section: "My finance", items: [
    { href: "/finance", label: "Overview", icon: "wallet", ownerOnly: true },
    { href: "/finance/investments", label: "Investments", icon: "hand-coins", ownerOnly: true },
    { href: "/finance/loans", label: "Bank loans", icon: "landmark", ownerOnly: true },
    { href: "/finance/reports", label: "Reports", icon: "chart-pie", ownerOnly: true },
  ]},
  { section: "Platform", items: [
    { href: "/workflows", label: "Workflows", icon: "workflow", adminOnly: true },
    { href: "/analytics", label: "Analytics", icon: "chart-no-axes-column", adminOnly: true },
    { href: "/config", label: "Configuration", icon: "settings-2", adminOnly: true },
  ]},
];

type Theme = "light" | "warm" | "dark";

export function AppShell({ children, displayName = "User", role = "member", isAdmin = false }: {
  children: React.ReactNode;
  displayName?: string;
  role?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setThemeRaw] = React.useState<Theme>("dark");
  const [inboxCount, setInboxCount] = React.useState(0);

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", user.id)
        .eq("channel", "in_app")
        .neq("status", "read");
      if (active) setInboxCount(count ?? 0);
    })();
    return () => { active = false; };
  }, [pathname]);

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
        {NAV.map((group) => ({ ...group, items: group.items.filter((it) => (isAdmin || !it.adminOnly) && (role === "owner" || !it.ownerOnly)) }))
          .filter((group) => group.items.length > 0)
          .map((group, gi) => (
          <SideNavSection key={gi} label={group.section || undefined}>
            {group.items.map((it) => (
              <SideNavItem
                key={it.href}
                icon={<Icon name={it.icon} size={16} />}
                label={it.label}
                count={it.href === "/inbox" ? inboxCount || undefined : it.count}
                active={
                  (pathname === it.href || pathname.startsWith(it.href + "/")) &&
                  /* Nested items (e.g. /finance/investments under /finance): the longest matching href wins. */
                  !NAV.some((g) => g.items.some((o) =>
                    o.href.length > it.href.length && (pathname === o.href || pathname.startsWith(o.href + "/"))
                  ))
                }
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
            <Avatar name={displayName} size={24} status="online" />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <span style={{ font: "var(--label-md)", fontSize: "var(--text-xs)", color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</span>
              <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)", textTransform: "capitalize" }}>{role}</span>
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
