import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAccess, type Access } from "@/lib/access";

/* The financing tracker lives in its OWN Supabase project (personal money,
   separate from HCM tenant data). That project has no auth users: every
   table is RLS-locked with no policies, and the app reaches it exclusively
   from the server with the secret key. Never import this from a client
   component. */

const FINANCE_URL = process.env.FINANCE_SUPABASE_URL ?? "https://ltmiaktqfpbbvcazcgzp.supabase.co";

export function financeConfigured() {
  return Boolean(process.env.FINANCE_SUPABASE_SECRET_KEY);
}

export function createFinanceClient() {
  const key = process.env.FINANCE_SUPABASE_SECRET_KEY;
  if (!key) throw new Error("FINANCE_SUPABASE_SECRET_KEY is not set — see docs/FINANCE.md");
  return createSupabaseClient(FINANCE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* Personal finance is visible to the workspace owner only — not the wider
   ADMIN_ROLES set (referral cuts and margins are private). */
export async function requireOwner(): Promise<Access | null> {
  const access = await getAccess();
  return access && access.role === "owner" ? access : null;
}
