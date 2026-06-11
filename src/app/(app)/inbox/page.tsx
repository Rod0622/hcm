import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/format";
import { Inbox, type NotificationRow } from "./inbox-client";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, payload, status, created_at")
    .eq("recipient_user_id", user!.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows: NotificationRow[] = (notifications ?? []).map((n) => {
    const payload = (n.payload ?? {}) as Record<string, string>;
    return {
      id: n.id,
      kind: payload.kind ?? "general",
      title: payload.title ?? "Notification",
      body: payload.body ?? "",
      link: payload.link ?? null,
      unread: n.status !== "read",
      when: relativeTime(n.created_at),
    };
  });

  return <Inbox rows={rows} />;
}
