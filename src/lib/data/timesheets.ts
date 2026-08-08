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

interface RawTimesheetRow {
  id: string;
  job_id: string;
  profile_id: string;
  started_at: string;
  ended_at: string | null;
  break_minutes: number;
  duration_minutes: number | null;
  is_manual_entry: boolean;
  notes: string | null;
  is_approved: boolean;
}

const TIMESHEET_COLUMNS =
  "id, job_id, profile_id, started_at, ended_at, break_minutes, duration_minutes, is_manual_entry, notes, is_approved";

/**
 * Confirmed via a direct SQL test (simulating this exact user's RLS
 * context) that the database happily returns these rows — RLS was never
 * the problem. The previous version of this file fetched job/profile
 * details inline with PostgREST's embedded-resource syntax
 * (`job:jobs(...)`, `profile:profiles(...)`), and every symptom reported
 * — clock-in "doing nothing", duplicate open shifts piling up, the End
 * Shift card never appearing — is consistent with that embedded query
 * failing outright (a bad/unsupported join) and the code only ever
 * reading `data`, never `error`, so the failure was indistinguishable
 * from "no open shift".
 *
 * This version does the simplest possible thing instead: fetch the
 * timesheet rows on their own (no embeds, nothing that can silently
 * break), then separately look up the handful of jobs/profiles needed to
 * label them. If those lookups fail for any reason, the timesheet itself
 * still comes back and still counts as "you're clocked in" — a missing
 * job name is a cosmetic problem, not a reason to hide the whole shift.
 */
async function attachJobsAndProfiles(rows: RawTimesheetRow[]): Promise<TimesheetRow[]> {
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const jobIds = [...new Set(rows.map((r) => r.job_id))];
  const profileIds = [...new Set(rows.map((r) => r.profile_id))];

  const [{ data: jobs, error: jobsError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from("jobs").select("id, job_number, job_name").in("id", jobIds),
    supabase.from("profiles").select("id, full_name").in("id", profileIds),
  ]);

  if (jobsError) console.error("[timesheets] job lookup failed", jobsError);
  if (profilesError) console.error("[timesheets] profile lookup failed", profilesError);

  const jobById = new Map((jobs ?? []).map((j) => [j.id, j]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((r) => ({
    id: r.id,
    job_id: r.job_id,
    started_at: r.started_at,
    ended_at: r.ended_at,
    break_minutes: r.break_minutes,
    duration_minutes: r.duration_minutes,
    is_manual_entry: r.is_manual_entry,
    notes: r.notes,
    is_approved: r.is_approved,
    job: jobById.get(r.job_id) ?? null,
    profile: profileById.get(r.profile_id) ?? null,
  }));
}

/** The signed-in tradesperson's currently open (clocked-in) shift, if any. */
export async function getOpenTimesheet(profileId: string): Promise<TimesheetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(TIMESHEET_COLUMNS)
    .eq("profile_id", profileId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getOpenTimesheet] query failed for profile", profileId, error);
  }
  if (!data) return null;

  const [attached] = await attachJobsAndProfiles([data as unknown as RawTimesheetRow]);
  return attached ?? null;
}

export async function listMyTimesheets(profileId: string): Promise<TimesheetRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(TIMESHEET_COLUMNS)
    .eq("profile_id", profileId)
    .order("started_at", { ascending: false })
    .limit(60);

  if (error) console.error("[listMyTimesheets] query failed for profile", profileId, error);
  return attachJobsAndProfiles((data ?? []) as unknown as RawTimesheetRow[]);
}

/** Office/admin: every timesheet, optionally filtered to unapproved-only. */
export async function listAllTimesheets(pendingOnly?: boolean): Promise<TimesheetRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("timesheets")
    .select(TIMESHEET_COLUMNS)
    .order("started_at", { ascending: false })
    .limit(200);

  if (pendingOnly) {
    query = query.eq("is_approved", false).not("ended_at", "is", null);
  }

  const { data, error } = await query;
  if (error) console.error("[listAllTimesheets] query failed", error);
  return attachJobsAndProfiles((data ?? []) as unknown as RawTimesheetRow[]);
}

export async function listTimesheetsForJob(jobId: string): Promise<TimesheetRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(TIMESHEET_COLUMNS)
    .eq("job_id", jobId)
    .order("started_at", { ascending: false });

  if (error) console.error("[listTimesheetsForJob] query failed for job", jobId, error);
  return attachJobsAndProfiles((data ?? []) as unknown as RawTimesheetRow[]);
}
