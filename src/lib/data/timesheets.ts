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

/** The signed-in tradesperson's currently open (clocked-in) shift, if any. */
export async function getOpenTimesheet(profileId: string): Promise<TimesheetRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timesheets")
    .select(
      "id, job_id, started_at, ended_at, break_minutes, duration_minutes, is_manual_entry, notes, is_approved, job:jobs(id, job_number, job_name), profile:profiles(id, full_name)"
    )
    .eq("profile_id", profileId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as unknown as TimesheetRow) ?? null;
}

export async function listMyTimesheets(profileId: string): Promise<TimesheetRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timesheets")
    .select(
      "id, job_id, started_at, ended_at, break_minutes, duration_minutes, is_manual_entry, notes, is_approved, job:jobs(id, job_number, job_name), profile:profiles(id, full_name)"
    )
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
    .select(
      "id, job_id, started_at, ended_at, break_minutes, duration_minutes, is_manual_entry, notes, is_approved, job:jobs(id, job_number, job_name), profile:profiles(id, full_name)"
    )
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
    .select(
      "id, job_id, started_at, ended_at, break_minutes, duration_minutes, is_manual_entry, notes, is_approved, job:jobs(id, job_number, job_name), profile:profiles(id, full_name)"
    )
    .eq("job_id", jobId)
    .order("started_at", { ascending: false });

  return (data ?? []) as unknown as TimesheetRow[];
}
