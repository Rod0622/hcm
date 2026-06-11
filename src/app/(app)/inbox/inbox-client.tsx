"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Button, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  unread: boolean;
  when: string;
};

const KIND_ICON: Record<string, string> = {
  leave_approval: "calendar-check",
  leave_decision: "calendar",
  general: "bell",
};

export function Inbox({ rows }: { rows: NotificationRow[] }) {
  const router = useRouter();
  const unread = rows.filter((r) => r.unread).length;

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    const supabase = createClient();
    await supabase.from("notifications").update({ status: "read" }).in("id", ids);
    router.refresh();
  };

  const open = async (row: NotificationRow) => {
    if (row.unread) await markRead([row.id]);
    if (row.link) router.push(row.link);
  };

  return (
    <Page
      eyebrow="Home"
      title="Inbox"
      actions={
        unread > 0 ? (
          <Button variant="secondary" size="sm" onClick={() => markRead(rows.filter((r) => r.unread).map((r) => r.id))}>
            Mark all read
          </Button>
        ) : null
      }
    >
      <Card padding="0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Icon name="inbox" size={18} />}
            title="You're all caught up"
            description="Leave approvals and workflow notifications land here."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => open(r)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left",
                  padding: "12px 20px", cursor: "pointer", background: "transparent", border: "none",
                  borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border-1)",
                }}
              >
                <span style={{ paddingTop: 2 }}>
                  <Icon name={KIND_ICON[r.kind] ?? "bell"} size={16} color={r.unread ? "var(--info-text)" : "var(--text-3)"} />
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{
                    font: r.unread ? "var(--label-md)" : "var(--body-sm)",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-1)",
                  }}>
                    {r.title}
                  </span>
                  {r.body ? (
                    <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>{r.body}</span>
                  ) : null}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)", color: "var(--text-3)" }}>{r.when}</span>
                  {r.unread ? <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--info)" }} /> : null}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}
