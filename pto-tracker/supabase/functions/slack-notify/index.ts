// Posts PTO request activity to a Slack channel via an incoming webhook.
//
// Deploy:  supabase functions deploy slack-notify
// Secret:  supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
//
// Invoked by the app (with the user's JWT) right after a request is filed
// or decided. Uses the service role only to read the rows it needs and to
// sign a short-lived URL for the proof file.

import { createClient } from "jsr:@supabase/supabase-js@2";

type Payload = { request_id: string; event: "created" | "decided" };

const TYPE_LABELS: Record<string, string> = {
  pto: "Paid time off",
  unpaid: "Leave without pay",
  offset: "Offset (work another day, same cutoff)",
};

const STATUS_EMOJI: Record<string, string> = {
  pending: "🟡",
  approved: "✅",
  denied: "❌",
  cancelled: "⚪",
};

function fmt(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

Deno.serve(async (req: Request) => {
  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return respond(405, { error: "POST only" });

  const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!webhookUrl) return respond(500, { error: "SLACK_WEBHOOK_URL is not set" });

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }
  if (!payload?.request_id || !["created", "decided"].includes(payload.event)) {
    return respond(400, { error: "Expected { request_id, event }" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Identify the caller from the JWT the gateway already verified.
  const authHeader = req.headers.get("Authorization") ?? "";
  const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  const caller = userData?.user;
  if (!caller) return respond(401, { error: "Unauthenticated" });

  const { data: request, error } = await admin
    .from("pto_requests")
    .select(
      "id, user_id, type, start_date, end_date, days, reason, proof_path, offset_date, status, admin_note, decided_by, profiles!pto_requests_user_id_fkey(full_name, username)"
    )
    .eq("id", payload.request_id)
    .single();
  if (error || !request) return respond(404, { error: "Request not found" });

  // Only the request owner announces a new filing; only an admin
  // announces a decision.
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", caller.id)
    .single();
  const isAdmin = callerProfile?.role === "admin";
  if (payload.event === "created" && request.user_id !== caller.id && !isAdmin) {
    return respond(403, { error: "Not your request" });
  }
  if (payload.event === "decided" && !isAdmin) {
    return respond(403, { error: "Admins only" });
  }

  const { data: balanceRows } = await admin.rpc("pto_balance", { target: request.user_id });
  const balance = Array.isArray(balanceRows) ? balanceRows[0] : balanceRows;

  const employee = (request as unknown as { profiles: { full_name: string; username: string } })
    .profiles;
  const emoji = STATUS_EMOJI[request.status] ?? "🟡";
  const range =
    request.start_date === request.end_date
      ? fmt(request.start_date)
      : `${fmt(request.start_date)} → ${fmt(request.end_date)}`;

  const lines: string[] = [
    `*Type:* ${TYPE_LABELS[request.type] ?? request.type}`,
    `*Dates:* ${range} (${request.days} working day${Number(request.days) === 1 ? "" : "s"})`,
  ];
  if (request.offset_date) lines.push(`*Will work instead on:* ${fmt(request.offset_date)}`);
  if (request.reason) lines.push(`*Reason:* ${request.reason}`);
  if (balance) {
    lines.push(
      `*Credits:* ${Number(balance.available).toFixed(2)} available ` +
        `(accrued ${Number(balance.accrued).toFixed(2)}, used ${Number(balance.used).toFixed(2)}, pending ${Number(balance.pending).toFixed(2)})`
    );
  }
  if (payload.event === "decided" && request.admin_note) {
    lines.push(`*Admin note:* ${request.admin_note}`);
  }

  if (request.proof_path) {
    const { data: signed } = await admin.storage
      .from("proofs")
      .createSignedUrl(request.proof_path, 60 * 60 * 24 * 7);
    if (signed?.signedUrl) lines.push(`*Proof:* <${signed.signedUrl}|attached file (link valid 7 days)>`);
  }

  const headline =
    payload.event === "created"
      ? `${emoji} New ${request.type === "pto" ? "PTO" : TYPE_LABELS[request.type].toLowerCase()} request from *${employee.full_name}*`
      : `${emoji} Request from *${employee.full_name}* was *${request.status.toUpperCase()}*` +
        (callerProfile?.full_name ? ` by ${callerProfile.full_name}` : "");

  const slackRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: headline.replaceAll("*", ""),
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: headline } },
        { type: "section", text: { type: "mrkdwn", text: lines.join("\n") } },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text:
                payload.event === "created"
                  ? "Review and approve in the PTO Tracker admin page."
                  : `Request ID ${request.id}`,
            },
          ],
        },
      ],
    }),
  });

  if (!slackRes.ok) {
    return respond(502, { error: `Slack webhook failed: ${slackRes.status}` });
  }
  return respond(200, { ok: true });
});
