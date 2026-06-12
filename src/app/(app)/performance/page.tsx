import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { Performance, type CycleRow, type GoalRow, type ReportRow, type SharedReview } from "./performance-client";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const supabase = await createClient();
  const access = await getAccess();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("workers")
    .select("id, tenant_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const [{ data: cycles }, { data: reports }] = await Promise.all([
    supabase.from("review_cycles").select("id, name, period_start, period_end, status").order("period_start", { ascending: false }),
    me
      ? supabase.from("workers")
          .select("id, person:people(full_name), position:positions(title)")
          .eq("manager_worker_id", me.id)
          .in("status", ["active", "onboarding"])
      : Promise.resolve({ data: [] }),
  ]);

  const reportIds = (reports ?? []).map((r) => r.id);
  const openCycle = (cycles ?? []).find((c) => c.status === "open") ?? null;

  const [{ data: myGoals }, { data: teamGoals }, { data: myReviews }, { data: teamReviews }] = await Promise.all([
    me
      ? supabase.from("goals").select("*").eq("worker_id", me.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    reportIds.length
      ? supabase.from("goals").select("*").in("worker_id", reportIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    me
      ? supabase.from("reviews")
          .select("id, rating, strengths, growth, summary, status, cycle:review_cycles(name)")
          .eq("worker_id", me.id)
          .eq("status", "shared")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    me && openCycle
      ? supabase.from("reviews")
          .select("id, worker_id, rating, strengths, growth, summary, status")
          .eq("cycle_id", openCycle.id)
          .in("worker_id", reportIds.length ? reportIds : ["00000000-0000-0000-0000-000000000000"])
      : Promise.resolve({ data: [] }),
  ]);

  const toGoal = (g: NonNullable<typeof myGoals>[number]): GoalRow => ({
    id: g.id,
    workerId: g.worker_id,
    title: g.title,
    description: g.description ?? "",
    status: g.status,
    progress: g.progress,
    due: g.due_on ? formatDate(g.due_on) : "—",
  });

  const reviewByWorker = new Map((teamReviews ?? []).map((r) => [r.worker_id, r]));

  const reportRows: ReportRow[] = (reports ?? []).map((r) => {
    const review = reviewByWorker.get(r.id);
    return {
      workerId: r.id,
      name: r.person?.full_name ?? "—",
      title: r.position?.title ?? "—",
      goals: (teamGoals ?? []).filter((g) => g.worker_id === r.id).map(toGoal),
      review: review
        ? { id: review.id, rating: review.rating, strengths: review.strengths ?? "", growth: review.growth ?? "", summary: review.summary ?? "", status: review.status }
        : null,
    };
  });

  const cycleRows: CycleRow[] = (cycles ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    period: `${formatDate(c.period_start)} → ${formatDate(c.period_end)}`,
    status: c.status,
  }));

  const sharedReviews: SharedReview[] = (myReviews ?? []).map((r) => ({
    id: r.id,
    cycle: r.cycle?.name ?? "—",
    rating: r.rating,
    strengths: r.strengths ?? "",
    growth: r.growth ?? "",
    summary: r.summary ?? "",
  }));

  return (
    <Performance
      me={me ? { workerId: me.id, tenantId: me.tenant_id } : null}
      isAdmin={access?.isAdmin ?? false}
      myGoals={(myGoals ?? []).map(toGoal)}
      sharedReviews={sharedReviews}
      reports={reportRows}
      cycles={cycleRows}
      openCycleId={openCycle?.id ?? null}
      openCycleName={openCycle?.name ?? null}
    />
  );
}
