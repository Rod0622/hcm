import { redirect } from "next/navigation";
import { CalendarCheck2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NavLinks, type NavItem } from "@/components/nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/calendar", label: "Calendar", icon: "calendar" },
    { href: "/requests", label: "My PTO", icon: "requests" },
  ];
  if (profile?.role === "admin") items.push({ href: "/admin", label: "Admin", icon: "admin" });
  items.push({ href: "/account", label: "Account", icon: "account" });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <CalendarCheck2 className="h-5 w-5" />
            <span className="font-semibold text-slate-900">PTO Tracker</span>
          </div>
          <NavLinks items={items} />
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-500">{profile?.full_name}</span>
            <form action="/auth/signout" method="post">
              <button
                className="text-slate-400 hover:text-slate-600"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
