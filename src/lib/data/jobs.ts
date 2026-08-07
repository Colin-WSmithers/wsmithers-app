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

export async function listJobsForCustomer(customerId: string): Promise<JobListRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(
      "id, job_number, job_name, status, start_date, expected_completion_date, customer:customers(display_name), site:sites(label, postcode)"
    )
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  return (data ?? []) as unknown as JobListRow[];
}

export interface JobForInvoicePicker {
  id: string;
  job_number: string;
  job_name: string;
  customer_id: string;
  site_id: string | null;
}

/** Lightweight list for the invoice/quote "which job is this for" picker — auto-fills customer/site. */
export async function listJobsForInvoicePicker(): Promise<JobForInvoicePicker[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, job_number, job_name, customer_id, site_id")
    .is("deleted_at", null)
    .order("job_number", { ascending: false });
  return data ?? [];
}

export interface SiteForPicker {
  id: string;
  customer_id: string;
  label: string;
  postcode: string;
}

/** All sites, for the job-creation form's client-side "site depends on customer" filter. */
export async function listSitesForPicker(): Promise<SiteForPicker[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("id, customer_id, label, postcode")
    .order("label", { ascending: true });
  return data ?? [];
}

export interface JobTeamMember {
  assignment_id: string;
  profile: { id: string; full_name: string; role: string } | null;
  subcontractor: { id: string; name: string; trade: string | null } | null;
  role_on_job: string | null;
}

export async function listJobAssignments(jobId: string): Promise<JobTeamMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_assignments")
    .select(
      "id, role_on_job, profile:profiles(id, full_name, role), subcontractor:subcontractors(id, name, trade)"
    )
    .eq("job_id", jobId);

  return ((data ?? []) as unknown as Array<{
    id: string;
    role_on_job: string | null;
    profile: { id: string; full_name: string; role: string } | null;
    subcontractor: { id: string; name: string; trade: string | null } | null;
  }>).map((row) => ({
    assignment_id: row.id,
    profile: row.profile,
    subcontractor: row.subcontractor,
    role_on_job: row.role_on_job,
  }));
}
