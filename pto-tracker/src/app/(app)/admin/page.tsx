import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accruedCredits, DEFAULT_SETTINGS } from "@/lib/pto";
import { ApprovalsSection, type PendingRow } from "./approvals-section";
import { EmployeesSection, type EmployeeRow } from "./employees-section";
import { AnnouncementsSection } from "./announcements-section";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/");

  const [{ data: pending }, { data: recent }, { data: profiles }, { data: allPto }, { data: settings }, { data: announcements }] =
    await Promise.all([
      supabase
        .from("pto_requests")
        .select("*, profiles!pto_requests_user_id_fkey(full_name, username)")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("pto_requests")
        .select("*, profiles!pto_requests_user_id_fkey(full_name, username)")
        .neq("status", "pending")
        .order("decided_at", { ascending: false, nullsFirst: false })
        .limit(15),
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("pto_requests").select("user_id, days, status, type").eq("type", "pto"),
      supabase.from("app_settings").select("*").maybeSingle(),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    ]);

  const monthly = Number(settings?.monthly_accrual ?? DEFAULT_SETTINGS.monthly_accrual);

  const signProof = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("proofs").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };
  const pendingRows: PendingRow[] = await Promise.all(
    (pending ?? []).map(async (r) => ({ ...r, proof_url: await signProof(r.proof_path) }))
  );
  const recentRows: PendingRow[] = (recent ?? []).map((r) => ({ ...r, proof_url: null }));

  const employees: EmployeeRow[] = (profiles ?? []).map((p) => {
    const mine = (allPto ?? []).filter((r) => r.user_id === p.id);
    const used = mine
      .filter((r) => r.status === "approved")
      .reduce((s, r) => s + Number(r.days), 0);
    const pendingDays = mine
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + Number(r.days), 0);
    const accrued = accruedCredits(p.date_hired, undefined, monthly);
    return { ...p, accrued, used, pending: pendingDays, available: accrued - used - pendingDays };
  });

  return (
    <div className="space-y-10">
      <ApprovalsSection pending={pendingRows} recent={recentRows} />
      <EmployeesSection employees={employees} meId={user.id} />
      <AnnouncementsSection announcements={announcements ?? []} />
    </div>
  );
}
