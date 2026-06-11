import { AppShell } from "@/components/app-shell";
import { getAccess } from "@/lib/access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
  return (
    <AppShell
      displayName={access?.displayName ?? "User"}
      role={access?.role ?? "member"}
      isAdmin={access?.isAdmin ?? false}
    >
      {children}
    </AppShell>
  );
}
