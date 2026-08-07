import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/supabase/types";

export interface JobListRow {
  id: string;
  job_number: string;
  job_name: string;
  status: JobStatus;
  start_date: string | null;
  expected_completion_date: string | null;
  customer: { display_name: string } | null;
  site: { label: string; postcode: string } | null;
}

/**
 * RLS does the real access control here — admins/office see every job,
 * tradespeople/subcontractors only ever get back jobs they're assigned to,
 * enforced at the database level (see supabase/migrations/0001_init.sql).
 */
export async function listJobs(statusFilter?: JobStatus): Promise<JobListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(
      "id, job_number, job_name, status, start_date, expected_completion_date, customer:customers(display_name), site:sites(label, postcode)"
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;
  return (data ?? []) as unknown as JobListRow[];
}

export interface JobDetail {
  id: string;
  job_number: string;
  job_name: string;
  description: string | null;
  status: JobStatus;
  start_date: string | null;
  expected_completion_date: string | null;
  estimated_value: number | null;
  estimated_cost: number | null;
  customer: { id: string; display_name: string; phone: string | null; email: string | null } | null;
  site: { label: string; address_line1: string; city: string | null; postcode: string } | null;
}

export async function getJobById(id: string): Promise<JobDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(
      `id, job_number, job_name, description, status, start_date, expected_completion_date,
       estimated_value, estimated_cost,
       customer:customers(id, display_name, phone, email),
       site:sites(label, address_line1, city, postcode)`
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  return (data as unknown as JobDetail) ?? null;
}
