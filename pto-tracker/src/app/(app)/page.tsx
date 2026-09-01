import Link from "next/link";
import { Megaphone, Wallet, CalendarClock, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cutoffFor, DEFAULT_SETTINGS, parseISO, toISODate, todayISO } from "@/lib/pto";
import { fmtCredits, fmtDate } from "@/lib/format";

/* Next monthly anniversary of the hire date after today — when the next
   0.5 credit lands. */
function nextAccrualDate(dateHired: string): string {
  const hired = parseISO(dateHired);
  const now = parseISO(todayISO());
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), hired.getUTCDate()));
  if (toISODate(next) <= todayISO()) next.setUTCMonth(next.getUTCMonth() + 1);
  return toISODate(next);
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: balanceRows }, { data: settings }, { data: announcements }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.rpc("pto_balance", { target: user.id }),
      supabase.from("app_settings").select("*").maybeSingle(),
      supabase
        .from("announcements")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const balance = balanceRows?.[0] ?? { accrued: 0, used: 0, pending: 0, available: 0 };
  const cutoff = cutoffFor(todayISO(), settings ?? DEFAULT_SETTINGS);
  const live = (announcements ?? []).filter(
    (a) => !a.expires_at || new Date(a.expires_at) > new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">
            Hi, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-slate-500">
            {profile?.date_hired
              ? `Hired ${fmtDate(profile.date_hired)} · next 0.5 credit on ${fmtDate(nextAccrualDate(profile.date_hired))}`
              : "No hire date on file yet — ask HR to set it so credits accrue."}
          </p>
        </div>
        <Link href="/requests?new=1" className="btn-primary">
          <Plus className="h-4 w-4" /> File PTO
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Available credits", value: fmtCredits(balance.available), accent: true },
          { label: "Accrued to date", value: fmtCredits(balance.accrued) },
          { label: "Used (approved)", value: fmtCredits(balance.used) },
          { label: "Pending requests", value: fmtCredits(balance.pending) },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide">
              <Wallet className="h-3.5 w-3.5" /> {c.label}
            </div>
            <div
              className={`mt-1 text-2xl font-semibold ${c.accent ? "text-indigo-600" : "text-slate-900"}`}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 flex items-center gap-3 text-sm text-slate-600">
        <CalendarClock className="h-4 w-4 text-slate-400 shrink-0" />
        <span>
          Current payroll cutoff: <strong>{fmtDate(cutoff.start)}</strong> –{" "}
          <strong>{fmtDate(cutoff.end)}</strong> · payday {fmtDate(cutoff.payday)} · target{" "}
          {(settings ?? DEFAULT_SETTINGS).hours_per_cutoff} hrs
        </span>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Megaphone className="h-5 w-5 text-indigo-600" /> Announcements
        </h2>
        {live.length === 0 && (
          <div className="card p-6 text-sm text-slate-500">Nothing posted right now.</div>
        )}
        {live.map((a) => {
          const mediaUrl = a.media_path
            ? supabase.storage.from("announcements").getPublicUrl(a.media_path).data.publicUrl
            : null;
          return (
            <article key={a.id} className="card p-5 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">{a.title}</h3>
                <time className="text-xs text-slate-400 shrink-0">
                  {new Date(a.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>
              {a.body && <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.body}</p>}
              {mediaUrl && a.media_type === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt={a.title}
                  className="rounded-lg max-h-96 w-auto border border-slate-200"
                />
              )}
              {mediaUrl && a.media_type === "video" && (
                <video src={mediaUrl} controls className="rounded-lg max-h-96 w-full" />
              )}
              {a.expires_at && (
                <p className="text-xs text-slate-400">
                  Visible until {fmtDate(a.expires_at.slice(0, 10))}
                </p>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
