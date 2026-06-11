/* Time Doctor 2 API client (read-only sync scaffold).
   Configure with TIMEDOCTOR_API_TOKEN + TIMEDOCTOR_COMPANY_ID; worklogs are
   pulled into time_entries (source 'timedoctor') keyed by external_id, and
   users are matched to workers by email. */

const BASE = "https://api2.timedoctor.com/api/1.0";

export function timeDoctorConfigured() {
  return !!(process.env.TIMEDOCTOR_API_TOKEN && process.env.TIMEDOCTOR_COMPANY_ID);
}

function params(extra: Record<string, string>) {
  return new URLSearchParams({
    token: process.env.TIMEDOCTOR_API_TOKEN!,
    company: process.env.TIMEDOCTOR_COMPANY_ID!,
    ...extra,
  }).toString();
}

export type TDUser = { id: string; email: string };

export async function tdUsers(): Promise<TDUser[]> {
  const res = await fetch(`${BASE}/users?${params({ limit: "500", detail: "info" })}`);
  if (!res.ok) throw new Error(`Time Doctor /users failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const list = Array.isArray(json.data) ? json.data : [];
  return list
    .filter((u: { id?: string; email?: string }) => u?.id && u?.email)
    .map((u: { id: string; email: string }) => ({ id: u.id, email: u.email.toLowerCase() }));
}

export type TDWorklog = {
  id: string | null;
  userId: string;
  start: string;       // ISO timestamp
  durationSec: number;
  mode: string;        // 'computer' | 'mobile' | 'manual' | 'break' | ...
};

export async function tdWorklogs(fromIso: string, toIso: string): Promise<TDWorklog[]> {
  const res = await fetch(`${BASE}/activity/worklog?${params({ from: fromIso, to: toIso, detail: "true" })}`);
  if (!res.ok) throw new Error(`Time Doctor /activity/worklog failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();

  // The worklog payload nests items per user; flatten defensively so minor
  // shape differences between API versions don't break the sync.
  const flat: Array<Record<string, unknown>> = [];
  const walk = (x: unknown) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") {
      const obj = x as Record<string, unknown>;
      if (typeof obj.start === "string" && (obj.time != null || obj.duration != null)) flat.push(obj);
      else Object.values(obj).forEach(walk);
    }
  };
  walk(json.data ?? []);

  return flat
    .filter((it) => it.userId)
    .map((it) => ({
      id: typeof it.id === "string" ? it.id : null,
      userId: String(it.userId),
      start: String(it.start),
      durationSec: Number(it.time ?? it.duration ?? 0),
      mode: typeof it.mode === "string" ? it.mode : "computer",
    }))
    .filter((it) => it.durationSec > 0);
}
