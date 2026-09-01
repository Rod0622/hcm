"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./requests";

const passwordSchema = z.object({
  current: z.string().min(1, "Enter your current password."),
  next: z.string().min(8, "New password must be at least 8 characters."),
});

export async function changePassword(input: unknown): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not signed in");

  // Usernames have no mailbox, so there is no email reset flow — re-verify
  // the current password before accepting a new one.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (verifyError) return { error: "Current password is wrong." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
  if (error) return { error: error.message };
  return { ok: true };
}

const employeeSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(200),
  date_hired: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  role: z.enum(["admin", "employee"]),
  active: z.boolean(),
});

export async function adminUpdateEmployee(input: unknown): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

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

  if (parsed.data.id === user.id && parsed.data.role !== "admin") {
    return { error: "You can't remove your own admin access." };
  }

  const { id, ...values } = parsed.data;
  const { error } = await supabase.from("profiles").update(values).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}
