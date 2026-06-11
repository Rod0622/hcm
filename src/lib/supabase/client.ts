import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/* Browser-side Supabase client. RLS enforces tenant isolation;
   see supabase/migrations for the schema and policies. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
