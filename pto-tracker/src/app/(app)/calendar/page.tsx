import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Team calendar</h1>
        <p className="text-sm text-slate-500">
          Who's out and when — plan around each other. Details stay private.
        </p>
      </div>
      <CalendarClient meId={user.id} />
    </div>
  );
}
