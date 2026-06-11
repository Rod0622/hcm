/* Outbound candidate email: composed templates + delivery through the
   outbound_emails outbox. Without RESEND_API_KEY configured, emails stay
   'queued' (visible in the candidate's history); with it, they deliver
   via Resend and are marked 'sent'/'failed'. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { formatMoney } from "@/lib/format";

const FREQUENCY_LABEL: Record<string, string> = {
  annual: "per year",
  monthly: "per month",
  hourly: "per hour",
};

export function offerEmailTemplate(params: {
  candidateName: string;
  roleTitle: string;
  company: string;
  amount: number;
  currency: string;
  frequency: string;
  startDate: string | null;
  notes: string | null;
}) {
  const pay = `${formatMoney(params.amount, params.currency)} ${FREQUENCY_LABEL[params.frequency] ?? params.frequency}`;
  return {
    subject: `Your offer from ${params.company} — ${params.roleTitle}`,
    body: [
      `Hi ${params.candidateName},`,
      ``,
      `We're excited to offer you the ${params.roleTitle} position at ${params.company}.`,
      ``,
      `Compensation: ${pay}`,
      params.startDate ? `Proposed start date: ${params.startDate}` : null,
      params.notes ? `` : null,
      params.notes,
      ``,
      `The formal offer letter is attached separately. Please sign and return it to accept — we can't wait to work with you.`,
      ``,
      `Warm regards,`,
      `${params.company} People Team`,
    ].filter((l) => l !== null).join("\n"),
  };
}

export function rejectionEmailTemplate(params: {
  candidateName: string;
  roleTitle: string;
  company: string;
}) {
  return {
    subject: `Update on your application — ${params.roleTitle} at ${params.company}`,
    body: [
      `Hi ${params.candidateName},`,
      ``,
      `Thank you for taking the time to apply for the ${params.roleTitle} position at ${params.company}.`,
      ``,
      `After careful consideration, we've decided to move forward with another candidate for this role. This was a difficult decision — we were impressed by your background and encourage you to apply for future openings that match your skills.`,
      ``,
      `We'll keep your resume on file and reach out if a fitting role opens up.`,
      ``,
      `Best wishes,`,
      `${params.company} People Team`,
    ].join("\n"),
  };
}

export async function sendCandidateEmail(
  supabase: SupabaseClient<Database>,
  params: {
    tenantId: string;
    applicationId: string | null;
    candidateId: string | null;
    kind: "offer" | "rejection" | "general";
    toEmail: string;
    toName: string | null;
    subject: string;
    body: string;
    userId: string;
  }
): Promise<{ status: "queued" | "sent" | "failed"; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  let status: "queued" | "sent" | "failed" = "queued";
  let error: string | undefined;

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "Tenkara People <onboarding@resend.dev>",
          to: [params.toEmail],
          subject: params.subject,
          text: params.body,
        }),
      });
      if (res.ok) {
        status = "sent";
      } else {
        status = "failed";
        error = `Email provider returned ${res.status}: ${(await res.text()).slice(0, 300)}`;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : "Email provider unreachable";
    }
  }

  await supabase.from("outbound_emails").insert({
    tenant_id: params.tenantId,
    application_id: params.applicationId,
    candidate_id: params.candidateId,
    kind: params.kind,
    to_email: params.toEmail,
    to_name: params.toName,
    subject: params.subject,
    body: params.body,
    status,
    error: error ?? null,
    sent_at: status === "sent" ? new Date().toISOString() : null,
    created_by: params.userId,
  });

  return { status, error };
}
