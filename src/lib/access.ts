import { createClient } from "@/lib/supabase/server";

/* Privileged roles see the whole tenant; everyone else is an employee who
   only sees their own records (enforced by RLS — this helper just drives
   navigation and page-level gating). */
export const ADMIN_ROLES = ["owner", "admin", "hr", "finance"];

export type Access = {
  userId: string;
  email: string;
  role: string;
  isAdmin: boolean;
  displayName: string;
};

export async function getAccess(): Promise<Access | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const role = membership?.role ?? "member";
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  return {
    userId: user.id,
    email: user.email ?? "",
    role,
    isAdmin: ADMIN_ROLES.includes(role),
    displayName: meta.full_name ?? user.email ?? "User",
  };
}
