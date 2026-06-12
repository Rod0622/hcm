"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Avatar, Input, Select, Dialog, EmptyState, IconButton, Banner, type BadgeTone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type GoalRow = {
  id: string;
  workerId: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  due: string;
};

export type SharedReview = {
  id: string;
  cycle: string;
  rating: number | null;
  strengths: string;
  growth: string;
  summary: string;
};

export type ReportRow = {
  workerId: string;
  name: string;
  title: string;
  goals: GoalRow[];
  review: { id: string; rating: number | null; strengths: string; growth: string; summary: string; status: string } | null;
};

export type CycleRow = { id: string; name: string; period: string; status: string };

const GOAL_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  on_track: { label: "On track", tone: "success" },
  at_risk: { label: "At risk", tone: "warning" },
  behind: { label: "Behind", tone: "danger" },
  done: { label: "Done", tone: "success" },
  dropped: { label: "Dropped", tone: "neutral" },
};
const GOAL_STATUS_OPTIONS = [
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "behind", label: "Behind" },
  { value: "done", label: "Done" },
  { value: "dropped", label: "Dropped" },
];

function ProgressBar({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, width: 150 }}>
      <span style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--bg-inset)", overflow: "hidden" }}>
        <span style={{ display: "block", width: `${value}%`, height: "100%", background: value >= 100 ? "var(--success)" : "var(--accent)" }} />
      </span>
      <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)", color: "var(--text-3)" }}>{value}%</span>
    </span>
  );
}

function Stars({ rating }: { rating: number | null }) {
  if (rating == null) return <span style={{ color: "var(--text-3)" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", gap: 2 }} title={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={13} color={i <= rating ? "var(--warning)" : "var(--border-2)"} />
      ))}
    </span>
  );
}

function GoalList({ goals, onEdit }: { goals: GoalRow[]; onEdit?: (g: GoalRow) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {goals.map((g, i) => {
        const s = GOAL_STATUS[g.status] ?? { label: g.status, tone: "neutral" as BadgeTone };
        return (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: i === goals.length - 1 ? "none" : "1px solid var(--border-1)" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{g.title}</span>
              <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>Due {g.due}{g.description ? ` · ${g.description}` : ""}</span>
            </div>
            <ProgressBar value={g.progress} />
            <Badge tone={s.tone} dot>{s.label}</Badge>
            {onEdit ? (
              <IconButton label="Update goal" onClick={() => onEdit(g)}>
                <Icon name="pencil" size={14} />
              </IconButton>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function GoalDialog({ open, onClose, tenantId, workerId, goal }: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  workerId: string;
  goal: GoalRow | null;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(goal?.title ?? "");
  const [description, setDescription] = React.useState(goal?.description ?? "");
  const [due, setDue] = React.useState("");
  const [progress, setProgress] = React.useState(String(goal?.progress ?? 0));
  const [status, setStatus] = React.useState(goal?.status ?? "on_track");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const pct = Math.max(0, Math.min(100, Number(progress) || 0));
    setBusy(true);
    setError(null);
    const supabase = createClient();
    let dbError = null;
    if (goal) {
      ({ error: dbError } = await supabase.from("goals")
        .update({ title: title.trim(), description: description.trim() || null, progress: pct, status })
        .eq("id", goal.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error: dbError } = await supabase.from("goals").insert({
        tenant_id: tenantId,
        worker_id: workerId,
        title: title.trim(),
        description: description.trim() || null,
        due_on: due || null,
        progress: pct,
        status,
        created_by: user?.id ?? null,
      }));
    }
    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      title={goal ? "Update goal" : "New goal"}
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Goal" placeholder="e.g. Ship the Q3 launch" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Details (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        {!goal ? <Input label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} /> : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Progress %" mono value={progress} onChange={(e) => setProgress(e.target.value)} />
          <Select label="Status" options={GOAL_STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

function ReviewDialog({ report, cycleId, cycleName, tenantId, reviewerWorkerId, onClose }: {
  report: ReportRow;
  cycleId: string;
  cycleName: string;
  tenantId: string;
  reviewerWorkerId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = React.useState(report.review?.rating != null ? String(report.review.rating) : "3");
  const [strengths, setStrengths] = React.useState(report.review?.strengths ?? "");
  const [growth, setGrowth] = React.useState(report.review?.growth ?? "");
  const [summary, setSummary] = React.useState(report.review?.summary ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const save = async (status: "draft" | "submitted" | "shared") => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      rating: Number(rating),
      strengths: strengths.trim() || null,
      growth: growth.trim() || null,
      summary: summary.trim() || null,
      status,
      submitted_at: status !== "draft" ? new Date().toISOString() : null,
    };
    let dbError = null;
    if (report.review) {
      ({ error: dbError } = await supabase.from("reviews").update(payload).eq("id", report.review.id));
    } else {
      ({ error: dbError } = await supabase.from("reviews").insert({
        tenant_id: tenantId,
        cycle_id: cycleId,
        worker_id: report.workerId,
        reviewer_worker_id: reviewerWorkerId,
        ...payload,
      }));
    }
    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open
      width={520}
      title={`Review — ${report.name}`}
      description={`${cycleName} · drafts are private; sharing makes the review visible to ${report.name.split(" ")[0]}.`}
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => save("draft")}>Save draft</Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => save("submitted")}>Submit</Button>
          <Button variant="primary" size="sm" disabled={busy} onClick={() => save("shared")}>Share with employee</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Select label="Rating (1–5)" options={["1", "2", "3", "4", "5"]} value={rating} onChange={(e) => setRating(e.target.value)} />
        <Input label="Strengths" placeholder="What went well" value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        <Input label="Growth areas" placeholder="What to improve" value={growth} onChange={(e) => setGrowth(e.target.value)} />
        <Input label="Summary" placeholder="Overall assessment" value={summary} onChange={(e) => setSummary(e.target.value)} />
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

export function Performance({ me, isAdmin, myGoals, sharedReviews, reports, cycles, openCycleId, openCycleName }: {
  me: { workerId: string; tenantId: string } | null;
  isAdmin: boolean;
  myGoals: GoalRow[];
  sharedReviews: SharedReview[];
  reports: ReportRow[];
  cycles: CycleRow[];
  openCycleId: string | null;
  openCycleName: string | null;
}) {
  const router = useRouter();
  const [goalDialog, setGoalDialog] = React.useState<{ open: boolean; goal: GoalRow | null; workerId: string | null }>({ open: false, goal: null, workerId: null });
  const [reviewTarget, setReviewTarget] = React.useState<ReportRow | null>(null);
  const [cycleDialog, setCycleDialog] = React.useState(false);
  const [cycleName, setCycleName] = React.useState("");
  const [cycleStart, setCycleStart] = React.useState("");
  const [cycleEnd, setCycleEnd] = React.useState("");

  const createCycle = async () => {
    if (!cycleName.trim() || !cycleStart || !cycleEnd || !me) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("review_cycles").insert({
      tenant_id: me.tenantId,
      name: cycleName.trim(),
      period_start: cycleStart,
      period_end: cycleEnd,
      created_by: user?.id ?? null,
    });
    setCycleDialog(false);
    setCycleName("");
    router.refresh();
  };

  const closeCycle = async (id: string) => {
    const supabase = createClient();
    await supabase.from("review_cycles").update({ status: "closed" }).eq("id", id);
    router.refresh();
  };

  return (
    <Page
      eyebrow="Workforce"
      title="Performance"
      actions={
        me ? (
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setGoalDialog({ open: true, goal: null, workerId: me.workerId })}>
            New goal
          </Button>
        ) : null
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {!me ? (
          <Banner tone="info" title="Your login isn't linked to an employee record" description="Goals and reviews are personal — link a worker to your account to use them." />
        ) : null}

        {me ? (
          <Card title="My goals" subtitle={openCycleName ? `Current cycle: ${openCycleName}` : "No open review cycle"} padding="0">
            {myGoals.length === 0 ? (
              <EmptyState icon={<Icon name="target" size={18} />} title="No goals yet" description="Set a goal — your manager sees progress alongside reviews." />
            ) : (
              <GoalList goals={myGoals} onEdit={(g) => setGoalDialog({ open: true, goal: g, workerId: g.workerId })} />
            )}
          </Card>
        ) : null}

        {me ? (
          <Card title="My reviews" subtitle="Shared with you by your manager" padding="0">
            {sharedReviews.length === 0 ? (
              <EmptyState icon={<Icon name="message-square" size={18} />} title="No shared reviews yet" description="Reviews appear here once your manager shares them." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {sharedReviews.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 20px", borderBottom: i === sharedReviews.length - 1 ? "none" : "1px solid var(--border-1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.cycle}</span>
                      <Stars rating={r.rating} />
                    </div>
                    {r.summary ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-1)" }}>{r.summary}</span> : null}
                    {r.strengths ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>Strengths: {r.strengths}</span> : null}
                    {r.growth ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>Growth: {r.growth}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {reports.length > 0 ? (
          <Card title="My team" subtitle={openCycleName ? `Write ${openCycleName} reviews and track your reports' goals` : "Track your reports' goals"} padding="0">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {reports.map((r, i) => (
                <div key={r.workerId} style={{ borderBottom: i === reports.length - 1 ? "none" : "1px solid var(--border-1)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px 4px" }}>
                    <Avatar name={r.name} size={28} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.name}</span>
                      <span style={{ font: "var(--body-sm)", fontSize: "var(--text-2xs)", color: "var(--text-3)" }}>{r.title}</span>
                    </div>
                    {r.review ? (
                      <Badge tone={r.review.status === "shared" ? "success" : r.review.status === "submitted" ? "info" : "neutral"} dot>
                        Review {r.review.status}
                      </Badge>
                    ) : null}
                    {openCycleId && me ? (
                      <Button size="sm" variant="secondary" onClick={() => setReviewTarget(r)}>
                        {r.review ? "Edit review" : "Write review"}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" icon={<Icon name="plus" size={13} />} onClick={() => setGoalDialog({ open: true, goal: null, workerId: r.workerId })}>
                      Goal
                    </Button>
                  </div>
                  {r.goals.length > 0 ? (
                    <div style={{ paddingLeft: 18 }}>
                      <GoalList goals={r.goals} onEdit={(g) => setGoalDialog({ open: true, goal: g, workerId: g.workerId })} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {isAdmin ? (
          <Card
            title="Review cycles"
            subtitle="Open a cycle so managers can write reviews"
            padding="0"
            actions={<Button size="sm" variant="secondary" icon={<Icon name="plus" size={13} />} onClick={() => setCycleDialog(true)}>New cycle</Button>}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {cycles.map((c, i) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: i === cycles.length - 1 ? "none" : "1px solid var(--border-1)" }}>
                  <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)", flex: 1 }}>{c.name}</span>
                  <span style={{ font: "var(--data-md)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>{c.period}</span>
                  <Badge tone={c.status === "open" ? "success" : "neutral"} dot>{c.status}</Badge>
                  {c.status === "open" ? (
                    <Button size="sm" variant="ghost" onClick={() => closeCycle(c.id)}>Close</Button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      {goalDialog.open && goalDialog.workerId && me ? (
        <GoalDialog
          open={goalDialog.open}
          onClose={() => setGoalDialog({ open: false, goal: null, workerId: null })}
          tenantId={me.tenantId}
          workerId={goalDialog.workerId}
          goal={goalDialog.goal}
        />
      ) : null}

      {reviewTarget && openCycleId && openCycleName && me ? (
        <ReviewDialog
          report={reviewTarget}
          cycleId={openCycleId}
          cycleName={openCycleName}
          tenantId={me.tenantId}
          reviewerWorkerId={me.workerId}
          onClose={() => setReviewTarget(null)}
        />
      ) : null}

      <Dialog
        open={cycleDialog}
        title="New review cycle"
        onClose={() => setCycleDialog(false)}
        footer={
          <React.Fragment>
            <Button variant="secondary" size="sm" onClick={() => setCycleDialog(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={createCycle}>Create</Button>
          </React.Fragment>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Name" placeholder="e.g. H2 2026" value={cycleName} onChange={(e) => setCycleName(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Period start" type="date" value={cycleStart} onChange={(e) => setCycleStart(e.target.value)} />
            <Input label="Period end" type="date" value={cycleEnd} onChange={(e) => setCycleEnd(e.target.value)} />
          </div>
        </div>
      </Dialog>
    </Page>
  );
}
