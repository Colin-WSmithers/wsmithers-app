import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface DashboardData {
  jobsToday: number;
  jobsThisWeek: number;
  staffWorkingToday: number;
  outstandingQuotesCount: number;
  outstandingQuotesValue: number;
  overdueInvoicesCount: number;
  unpaidInvoiceTotal: number;
  enquiriesNeedingResponse: number;
  recentlyUpdatedJobs: { id: string; job_number: string; job_name: string; status: string; updated_at: string }[];
}

/**
 * Every number here is a real query against Postgres — nothing is
 * hard-coded. Against an empty database (before seed data or before the
 * business has any jobs yet) everything correctly reads as 0, which the UI
 * renders as a clear empty state rather than a fake number.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [
    jobsToday,
    jobsThisWeek,
    staffToday,
    outstandingQuotes,
    overdueInvoices,
    enquiries,
    recentJobs,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString()),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", weekEnd.toISOString()),
    supabase
      .from("appointment_assignments")
      .select("profile_id, appointments!inner(starts_at)")
      .gte("appointments.starts_at", todayStart.toISOString())
      .lt("appointments.starts_at", todayEnd.toISOString())
      .not("profile_id", "is", null),
    supabase.from("quotes").select("grand_total").in("status", ["sent", "viewed"]),
    supabase
      .from("invoices")
      .select("total, amount_paid")
      .eq("status", "overdue"),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "contacted", "quote_required"]),
    supabase
      .from("jobs")
      .select("id, job_number, job_name, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const distinctStaffToday = new Set((staffToday.data ?? []).map((r: { profile_id: string }) => r.profile_id)).size;

  const outstandingQuotesValue = (outstandingQuotes.data ?? []).reduce(
    (sum, q) => sum + Number(q.grand_total ?? 0),
    0
  );

  const unpaidInvoiceTotal = (overdueInvoices.data ?? []).reduce(
    (sum, inv) => sum + (Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0)),
    0
  );

  return {
    jobsToday: jobsToday.count ?? 0,
    jobsThisWeek: jobsThisWeek.count ?? 0,
    staffWorkingToday: distinctStaffToday,
    outstandingQuotesCount: outstandingQuotes.data?.length ?? 0,
    outstandingQuotesValue,
    overdueInvoicesCount: overdueInvoices.data?.length ?? 0,
    unpaidInvoiceTotal,
    enquiriesNeedingResponse: enquiries.count ?? 0,
    recentlyUpdatedJobs: recentJobs.data ?? [],
  };
}
