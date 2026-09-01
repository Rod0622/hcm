import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/pto";
import { RequestsClient } from "./requests-client";

export default async function RequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: requests }, { data: balanceRows }, { data: settings }] = await Promise.all([
    supabase
      .from("pto_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("pto_balance", { target: user.id }),
    supabase.from("app_settings").select("*").maybeSingle(),
  ]);

  // Short-lived links so the owner can review what they attached.
  const withProofs = await Promise.all(
    (requests ?? []).map(async (r) => {
      if (!r.proof_path) return { ...r, proof_url: null };
      const { data } = await supabase.storage.from("proofs").createSignedUrl(r.proof_path, 3600);
      return { ...r, proof_url: data?.signedUrl ?? null };
    })
  );

  return (
    <RequestsClient
      meId={user.id}
      requests={withProofs}
      balance={balanceRows?.[0] ?? { accrued: 0, used: 0, pending: 0, available: 0 }}
      settings={settings ?? { ...DEFAULT_SETTINGS, id: true }}
    />
  );
}
