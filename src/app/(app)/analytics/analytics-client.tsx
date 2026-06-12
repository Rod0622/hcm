"use client";

import * as React from "react";
import { Page } from "@/components/app-shell";
import { Card, Stat, Badge, Table, EmptyState, Icon, type BadgeTone } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export type AnalyticsData = {
  headcount: number;
  departments: number;
  attritionYtd: number;
  hiresYtd: number;
  headcountSeries: Array<{ m: string; v: number }>;
  deptMix: Array<{ label: string; count: number }>;
  countryMix: Array<{ label: string; count: number }>;
  leaveByType: Array<{ label: string; days: number }>;
  attendance: Array<{ day: string; work: number; brk: number }>;
  runs: Array<{ group: string; period: string; currency: string; net: number; employees: number; status: string }>;
  funnel: Array<{ label: string; count: number }>;
};

const RUN_TONE: Record<string, BadgeTone> = {
  draft: "neutral", in_review: "warning", approved: "info", processed: "success", cancelled: "neutral",
};
const FUNNEL_TONE: Record<string, BadgeTone> = {
  new: "info", shortlisted: "success", interviewing: "info", offer: "warning", hired: "success", rejected: "neutral",
};

function BarColumn({ series, color }: { series: Array<{ label: string; value: number; sub?: number }>; color?: string }) {
  const max = Math.max(...series.map((s) => s.value + (s.sub ?? 0)), 1) * 1.15;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, paddingTop: 8 }}>
      {series.map((s, i) => (
        <div key={`${s.label}${i}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }} title={`${s.label}: ${s.value}${s.sub ? ` (+${s.sub})` : ""}`}>
          <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)", color: "var(--text-3)" }}>{s.value}</span>
          <div style={{ width: "100%", maxWidth: 30, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            {s.sub ? <div style={{ width: "100%", height: `${(s.sub / max) * 100}%`, background: "var(--warning)", opacity: 0.5, borderRadius: "3px 3px 0 0" }} /> : null}
            <div style={{ width: "100%", height: `${Math.max((s.value / max) * 100, 2)}%`, background: color ?? "var(--chart-1)", borderRadius: s.sub ? "0 0 2px 2px" : "3px 3px 2px 2px" }} />
          </div>
          <span style={{ font: "var(--weight-medium) var(--text-2xs)/1 var(--font-sans)", color: "var(--text-3)", whiteSpace: "nowrap" }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function BarRows({ rows, unit }: { rows: Array<{ label: string; value: number }>; unit: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 110, font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
          <span style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg-inset)", overflow: "hidden" }}>
            <span style={{ display: "block", width: `${(r.value / max) * 100}%`, height: "100%", background: "var(--accent)" }} />
          </span>
          <span style={{ width: 56, textAlign: "right", font: "var(--data-md)", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>{r.value} {unit}</span>
        </div>
      ))}
    </div>
  );
}

export function Analytics({ data }: { data: AnalyticsData }) {
  return (
    <Page eyebrow="Platform" title="Analytics">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)" }}>
          <Card><Stat label="Headcount" value={String(data.headcount)} hint="active + onboarding" /></Card>
          <Card><Stat label="Hires YTD" value={String(data.hiresYtd)} hint="this year" /></Card>
          <Card><Stat label="Attrition YTD" value={String(data.attritionYtd)} hint="terminations" /></Card>
          <Card><Stat label="Departments" value={String(data.departments)} hint="with active staff" /></Card>
        </div>

        <Card title="Headcount" subtitle="Trailing 12 months · hires minus terminations">
          <BarColumn series={data.headcountSeries.map((s) => ({ label: s.m, value: s.v }))} />
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", alignItems: "start" }}>
          <Card title="Department mix" subtitle="Active employees">
            <BarRows rows={data.deptMix.map((d) => ({ label: d.label, value: d.count }))} unit="" />
          </Card>
          <Card title="By country" subtitle="Legal entity country">
            <BarRows rows={data.countryMix.map((d) => ({ label: d.label, value: d.count }))} unit="" />
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "var(--space-4)", alignItems: "start" }}>
          <Card title="Attendance" subtitle="Clocked hours per day · last 14 days (amber = breaks)">
            {data.attendance.length === 0 ? (
              <EmptyState icon={<Icon name="clock" size={18} />} title="No clocked time yet" description="Hours appear as the team uses the time clock." />
            ) : (
              <BarColumn series={data.attendance.map((a) => ({ label: a.day, value: a.work, sub: a.brk }))} />
            )}
          </Card>
          <Card title="Leave taken" subtitle="Approved days this year">
            {data.leaveByType.length === 0 ? (
              <EmptyState icon={<Icon name="calendar" size={18} />} title="No approved leave yet" description="Approved leave days by type show here." />
            ) : (
              <BarRows rows={data.leaveByType.map((l) => ({ label: l.label, value: l.days }))} unit="d" />
            )}
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "var(--space-4)", alignItems: "start" }}>
          <Card title="Payroll runs" subtitle="Latest runs across pay groups" padding="0">
            {data.runs.length === 0 ? (
              <EmptyState icon={<Icon name="banknote" size={18} />} title="No runs yet" description="Calculated runs appear here." />
            ) : (
              <Table
                compact
                rowKey="period"
                columns={[
                  { key: "group", label: "Pay group" },
                  { key: "period", label: "Period", mono: true },
                  { key: "net", label: "Net", mono: true, align: "right", render: (r) => <span>{formatMoney(r.net, r.currency)}</span> },
                  { key: "employees", label: "Emp", mono: true, align: "right" },
                  { key: "status", label: "Status", render: (r) => <Badge tone={RUN_TONE[r.status] ?? "neutral"} dot>{r.status.replace("_", " ")}</Badge> },
                ]}
                rows={data.runs}
              />
            )}
          </Card>
          <Card title="Recruiting funnel" subtitle="All applications by stage">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.funnel.length === 0 ? (
                <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>No applications yet.</span>
              ) : data.funnel.map((f) => (
                <Badge key={f.label} tone={FUNNEL_TONE[f.label] ?? "neutral"}>
                  {f.label.replace("_", " ")} · {f.count}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
