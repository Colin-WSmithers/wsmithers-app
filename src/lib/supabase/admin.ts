import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role Supabase client for trusted server-only contexts that have no
 * user session to attach (e.g. a Vercel Cron route). This BYPASSES Row Level
 * Security entirely, so it must never be exposed to the browser and must
 * only ever be used from code that has already verified the caller (see
 * the CRON_SECRET check in /api/cron/mark-overdue).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set in the environment — this is
 * the "service_role" secret key from Supabase Project Settings -> API, and
 * is deliberately NOT prefixed with NEXT_PUBLIC_ so it's never bundled to
 * the client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set to use the admin client.");
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
