import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/format";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">My account</h1>

      <div className="card p-5 space-y-2 text-sm">
        <Row label="Full name" value={profile?.full_name ?? "—"} />
        <Row label="Username" value={profile?.username ?? "—"} />
        <Row label="Role" value={profile?.role === "admin" ? "Admin" : "Employee"} />
        <Row label="Date hired" value={fmtDate(profile?.date_hired)} />
        <p className="pt-2 text-xs text-slate-400">
          Name, hire date and role are managed by HR. Forgot your password? An admin can reset it
          from the Supabase dashboard.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
