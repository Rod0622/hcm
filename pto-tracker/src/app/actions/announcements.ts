"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./requests";

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

async function requireAdmin() {
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
  return { supabase, user };
}

function mediaTypeOf(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

async function uploadMedia(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  file: File
): Promise<{ path?: string; media_type?: "image" | "video"; error?: string }> {
  const media_type = mediaTypeOf(file);
  if (!media_type) return { error: "Media must be an image or a video." };
  if (file.size > MAX_MEDIA_BYTES) return { error: "Media must be 50MB or smaller." };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `media/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from("announcements")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) return { error: `Media upload failed: ${error.message}` };
  return { path, media_type };
}

const fieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  body: z.string().trim().max(10000).optional(),
  expires_at: z.string().optional(),
});

function parseFields(formData: FormData) {
  const parsed = fieldsSchema.safeParse({
    title: formData.get("title") ?? "",
    body: (formData.get("body") as string) ?? "",
    expires_at: (formData.get("expires_at") as string) ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { title, body, expires_at } = parsed.data;
  return {
    values: {
      title,
      body: body || null,
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    },
  };
}

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const fields = parseFields(formData);
  if ("error" in fields) return { error: fields.error };

  let media_path: string | null = null;
  let media_type: "image" | "video" | null = null;
  const file = formData.get("media");
  if (file instanceof File && file.size > 0) {
    const up = await uploadMedia(supabase, file);
    if (up.error) return { error: up.error };
    media_path = up.path!;
    media_type = up.media_type!;
  }

  const { error } = await supabase.from("announcements").insert({
    ...fields.values!,
    media_path,
    media_type,
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateAnnouncement(id: string, formData: FormData): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid announcement." };
  const { supabase } = await requireAdmin();
  const fields = parseFields(formData);
  if ("error" in fields) return { error: fields.error };

  const update: Partial<
    Pick<
      import("@/lib/supabase/types").Announcement,
      "title" | "body" | "expires_at" | "media_path" | "media_type"
    >
  > = { ...fields.values };
  const file = formData.get("media");
  if (file instanceof File && file.size > 0) {
    const up = await uploadMedia(supabase, file);
    if (up.error) return { error: up.error };
    update.media_path = up.path;
    update.media_type = up.media_type;
  } else if (formData.get("remove_media") === "on") {
    update.media_path = null;
    update.media_type = null;
  }

  const { error } = await supabase.from("announcements").update(update).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function setAnnouncementArchived(id: string, archived: boolean): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid announcement." };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("announcements").update({ archived }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid announcement." };
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase
    .from("announcements")
    .select("media_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { error: error.message };

  if (existing?.media_path) {
    await supabase.storage.from("announcements").remove([existing.media_path]);
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}
