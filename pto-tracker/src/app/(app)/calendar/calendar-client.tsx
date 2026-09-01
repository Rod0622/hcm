"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEntry } from "@/lib/supabase/types";
import { addDays, isWeekend, todayISO, toISODate } from "@/lib/pto";

type DayChip = {
  key: string;
  name: string;
  mine: boolean;
  kind: "approved" | "pending" | "works";
};

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CalendarClient({ meId }: { meId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = toISODate(new Date(Date.UTC(year, month, 1)));
  const monthEnd = toISODate(new Date(Date.UTC(year, month + 1, 0)));

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("calendar_entries", {
      from_date: monthStart,
      to_date: monthEnd,
    });
    setEntries(data ?? []);
    setLoading(false);
  }, [monthStart, monthEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  const chipsByDay = useMemo(() => {
    const map = new Map<string, DayChip[]>();
    const push = (day: string, chip: DayChip) => {
      if (day < monthStart || day > monthEnd) return;
      const list = map.get(day) ?? [];
      list.push(chip);
      map.set(day, list);
    };
    for (const e of entries) {
      const firstName = e.full_name.split(" ")[0];
      for (let d = e.start_date; d <= e.end_date; d = addDays(d, 1)) {
        if (isWeekend(d)) continue; // leave only consumes working days
        push(d, {
          key: `${e.id}-${d}`,
          name: firstName,
          mine: e.user_id === meId,
          kind: e.status === "approved" ? "approved" : "pending",
        });
      }
      if (e.type === "offset" && e.offset_date) {
        push(e.offset_date, {
          key: `${e.id}-works`,
          name: `${firstName} works`,
          mine: e.user_id === meId,
          kind: "works",
        });
      }
    }
    return map;
  }, [entries, meId, monthStart, monthEnd]);

  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toISODate(new Date(Date.UTC(year, month, i + 1)))
    ),
  ];
  const today = todayISO();

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <button className="btn-secondary !px-2" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-semibold">{monthLabel(year, month)}</div>
        <button className="btn-secondary !px-2" onClick={() => shiftMonth(1)} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium text-slate-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 ${loading ? "opacity-50" : ""}`}>
        {cells.map((day, i) => (
          <div
            key={day ?? `pad-${i}`}
            className={`min-h-24 border-b border-r border-slate-100 p-1.5 text-xs ${
              day && isWeekend(day) ? "bg-slate-50/70" : ""
            }`}
          >
            {day && (
              <>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                      day === today ? "bg-indigo-600 text-white font-semibold" : "text-slate-500"
                    }`}
                  >
                    {Number(day.slice(8))}
                  </span>
                  <Link
                    href={`/requests?new=1&date=${day}`}
                    className="text-slate-300 hover:text-indigo-600"
                    title="File PTO for this day"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-1 space-y-0.5">
                  {(chipsByDay.get(day) ?? []).map((chip) => (
                    <div
                      key={chip.key}
                      className={`truncate rounded px-1 py-0.5 leading-tight ${
                        chip.kind === "approved"
                          ? "bg-indigo-100 text-indigo-800"
                          : chip.kind === "works"
                            ? "bg-emerald-100 text-emerald-800"
                            : "border border-dashed border-amber-400 bg-amber-50 text-amber-800"
                      } ${chip.mine ? "font-semibold" : ""}`}
                      title={chip.kind === "pending" ? `${chip.name} (pending)` : chip.name}
                    >
                      {chip.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 px-4 py-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-indigo-100 ring-1 ring-indigo-300" /> Approved leave
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-dashed border-amber-400 bg-amber-50" />{" "}
          Pending request
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Offset work day
        </span>
      </div>
    </div>
  );
}
