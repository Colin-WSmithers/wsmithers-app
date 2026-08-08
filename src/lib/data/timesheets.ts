import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface TimesheetRow {
  id: string;
  job_id: string;
  started_at: string;
  ended_at: string | null;
  break_minutes: number;
  duration_minutes: number | null;
  is_manual_entry: boolean;
  notes: string | null;
  is_approved: boolean;
  job: { id: string; job_number: string; job_name: string } | null;
  profile: { id: string; full_name: string } | null;
}

// NOTE on `!left`: job_id and profile_id are NOT NULL columns, so PostgREST's
// default resource-embedding behaviour treats jobs/profiles as an INNER JOIN.
// Combined with RLS on `jobs` (tradespeople can only SELECT jobs they have a
// job_assignments row for), that inner join silently drops the *entire*
// timesheets row whenever the embedded jobs lookup doesn't resolve for any
// reason (RLS edge case, replication lag, a job assignment that hasn't
// propagated yet, etc) — even though the timesheets row itself is fully
// visible under `timesheets_self_all`. That was the root cause of clock-in
// looking like it silently did nothing: the insert succeeded every time, but
// the very next `getOpenTimesheet` read the row back through this same
// implicit inner join and got zero rows, so the UI never left the "start
// shift" state and duplicate open shifts kept accumulating. `!left` forces
// an explicit LEFT JOIN so the timesheet itself is never hidden by a
// problem resolving its embedded job/profile.
const TIMESHEET_SELECT =
  "id, job_id, started_at, ended_at, break_minutes, duration_minutes, is_manual_entry, notes, is_approved, job:jobs!left(id, job_number, job_name), profile:profiles!left(id, full_name)";

/** The signed-in tradesperson's currently open (clocked-in) shift, if any. */
export async function getOpenTimesheet(profileId: string): Promise<TimesheetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(TIMESHEET_SELECT)
    .eq("profile_id", profileId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Every previous "clock-in does nothing" theory (caching, inner-join-vs-
  // RLS) assumed this query was quietly returning zero rows. It's never
  // once been confirmed, because the error from this call was never
  // actually looked at — only `data` was read, so if the query itself
  // failed (RLS, a bad embed, anything) it silently looked identical to
  // "no open shift". Logging it here means the *real* reason shows up in
  // Vercel's function logs on the very next clock-in attempt.
  if (error) {
    console.error("[getOpenTimesheet] query failed for profile", profileId, error);
  }

  return (data as unknown as TimesheetRow) ?? null;
}

export async function listMyTimesheets(profileId: string): Promise<TimesheetRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timesheets")
    .select(TIMESHEET_SELECT)
    .eq("profile_id", profileId)
    .order("started_at", { ascending: false })
    .limit(60);

  return (data ?? []) as unknown as TimesheetRow[];
}

/** Office/admin: every timesheet, optionally filtered to unapproved-only. */
export async function listAllTimesheets(pendingOnly?: boolean): Promise<TimesheetRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("timesheets")
    .select(TIMESHEET_SELECT)
    .order("started_at", { ascending: false })
    .limit(200);

  if (pendingOnly) {
    query = query.eq("is_approved", false).not("ended_at", "is", null);
  }

  const { data } = await query;
  return (data ?? []) as unknown as TimesheetRow[];
}

export async function listTimesheetsForJob(jobId: string): Promise<TimesheetRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timesheets")
    .select(TIMESHEET_SELECT)
    .eq("job_id", jobId)
    .order("started_at", { ascending: false });

  return (data ?? []) as unknown as TimesheetRow[];
}
