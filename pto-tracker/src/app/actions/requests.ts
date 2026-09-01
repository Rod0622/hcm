"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { businessDays, sameCutoff, DEFAULT_SETTINGS } from "@/lib/pto";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z
  .object({
    type: z.enum(["pto", "unpaid", "offset"]),
    start_date: z.string().regex(ISO_DATE),
    end_date: z.string().regex(ISO_DATE),
    reason: z.string().trim().max(2000).optional(),
    proof_path: z.string().max(500).optional(),
    offset_date: z.string().regex(ISO_DATE).optional(),
  })
  .refine((v) => v.end_date >= v.start_date, { message: "End date is before start date." });

export type ActionResult = { error?: string; warning?: string; ok?: boolean };

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/requests");
  revalidatePath("/calendar");
  revalidatePath("/admin");
}

export async function createRequest(input: unknown): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const req = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const days = businessDays(req.start_date, req.end_date);
  if (days <= 0) {
    return { error: "The selected range has no working days (Mon–Fri)." };
  }

  // A proof can only live in the requester's own folder.
  if (req.proof_path && !req.proof_path.startsWith(`${user.id}/`)) {
    return { error: "Invalid proof file." };
  }

  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .maybeSingle();
  const cutoffCfg = settings ?? DEFAULT_SETTINGS;

  if (req.type === "pto") {
    const { data: balanceRows, error: balErr } = await supabase.rpc("pto_balance", {
      target: user.id,
    });
    if (balErr) return { error: "Could not check your PTO balance. Try again." };
    const balance = balanceRows?.[0];
    const available = Number(balance?.available ?? 0);
    if (available < days) {
      return {
        error:
          `Not enough PTO credits: this needs ${days}, you have ${available.toFixed(2)} available. ` +
          "File it as leave without pay, or as an offset (work another day in the same cutoff).",
      };
    }
  }

  if (req.type === "offset") {
    if (!req.offset_date) {
      return { error: "Pick the day you will work instead." };
    }
    if (!sameCutoff(req.offset_date, req.start_date, cutoffCfg)) {
      return {
        error:
          "The day you work instead must fall in the same bi-weekly payroll cutoff " +
          "as the day off, so the 80 hours per cutoff still complete.",
      };
    }
    if (req.offset_date >= req.start_date && req.offset_date <= req.end_date) {
      return { error: "The offset work day can't be one of the days you're taking off." };
    }
  }

  const { data: created, error } = await supabase
    .from("pto_requests")
    .insert({
      user_id: user.id,
      type: req.type,
      start_date: req.start_date,
      end_date: req.end_date,
      reason: req.reason || null,
      proof_path: req.proof_path || null,
      offset_date: req.type === "offset" ? req.offset_date : null,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { error: error?.message ?? "Could not file the request." };
  }

  revalidateAll();

  // Slack is best-effort — the request is already filed.
  const { error: fnError } = await supabase.functions.invoke("slack-notify", {
    body: { request_id: created.id, event: "created" },
  });
  if (fnError) {
    return {
      ok: true,
      warning: "Request filed, but the Slack notification failed — tell HR directly.",
    };
  }
  return { ok: true };
}

export async function cancelRequest(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid request." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // RLS also restricts this to the caller's own pending requests.
  const { error, count } = await supabase
    .from("pto_requests")
    .update({ status: "cancelled" }, { count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending");
  if (error) return { error: error.message };
  if (!count) return { error: "Only pending requests can be cancelled." };
  revalidateAll();
  return { ok: true };
}

const decideSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "denied"]),
  admin_note: z.string().trim().max(2000).optional(),
});

export async function decideRequest(input: unknown): Promise<ActionResult> {
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid decision." };
  const { id, decision, admin_note } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") throw new Error("Admins only");

  const { error, count } = await supabase
    .from("pto_requests")
    .update(
      {
        status: decision,
        admin_note: admin_note || null,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
      },
      { count: "exact" }
    )
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: error.message };
  if (!count) return { error: "This request was already decided or cancelled." };

  revalidateAll();

  const { error: fnError } = await supabase.functions.invoke("slack-notify", {
    body: { request_id: id, event: "decided" },
  });
  if (fnError) {
    return { ok: true, warning: "Decision saved, but the Slack notification failed." };
  }
  return { ok: true };
}
