import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { Requests, type RequestItem } from "./requests-client";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const supabase = await createClient();
  const access = await getAccess();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("workers")
    .select("id, tenant_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  // RLS scopes this: members see their own, admins see everyone's.
  const { data: requests } = await supabase
    .from("doc_requests")
    .select("id, worker_id, kind, details, status, file_path, file_name, created_at, worker:workers(person:people(full_name))")
    .order("created_at", { ascending: false })
    .limit(100);

  const paths = (requests ?? []).map((r) => r.file_path).filter((p): p is string => !!p);
  const { data: signed } = paths.length
    ? await supabase.storage.from("hr-docs").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).filter((s) => !s.error).map((s) => [s.path, s.signedUrl]));

  const rows: RequestItem[] = (requests ?? []).map((r) => ({
    id: r.id,
    workerId: r.worker_id,
    who: r.worker?.person?.full_name ?? "—",
    mine: !!me && r.worker_id === me.id,
    kind: r.kind,
    details: r.details ?? "—",
    status: r.status,
    filed: formatDate(r.created_at),
    fileName: r.file_name,
    fileUrl: r.file_path ? urlByPath.get(r.file_path) ?? null : null,
  }));

  return (
    <Requests
      me={me ? { workerId: me.id, tenantId: me.tenant_id } : null}
      isAdmin={access?.isAdmin ?? false}
      rows={rows}
    />
  );
}
