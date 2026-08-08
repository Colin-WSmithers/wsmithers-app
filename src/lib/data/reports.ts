import "server-only";
import { createClient } from "@/lib/supabase/server";
import { londonDateKey, londonDayStart, londonMonthStartKey, londonWeekStartKey } from "@/lib/utils";

export interface JobProfitabilityRow {
  id: string;
  job_number: string;
  job_name: string;
  status: string;
  estimated_value: number;
  actual_cost: number;
  margin: number;
}

export interface StaffHoursRow {
  profile_id: string;
  full_name: string;
  minutes: number;
}

export interface OverdueInvoiceRow {
  id: string;
  invoice_number: string;
  customer_name: string;
  due_date: string;
  outstanding: number;
}

export interface ReportsData {
  revenueThisMonth: number;
  paidThisMonth: number;
  outstandingBalance: number;
  overdueInvoicesCount: number;
  overdueInvoicesValue: number;
  overdueInvoices: OverdueInvoiceRow[];
  outstandingQuotesValue: number;
  outstandingQuotesCount: number;
  quotesSentLast90: number;
  quotesAcceptedLast90: number;
  jobProfitability: JobProfitabilityRow[];
  staffHoursThisWeek: StaffHoursRow[];
  openPurchaseOrdersValue: number;
}

// All boundaries below are London-local (see lib/utils) rather than UTC, so
// "this month" / "this week" line up with how the office actually counts them.
function daysAgo(n: number): string {
  const today = londonDateKey();
  const [y, m, d] = today.split("-").map(Number);
  return londonDateKey(new Date(Date.UTC(y, m - 1, d - n, 12)));
}

export async function getReportsData(): Promise<ReportsData> {
  const supabase = await createClient();
  const monthStart = londonMonthStartKey();
  const weekStart = londonDayStart(londonWeekStartKey()).toISOString();
  const today = londonDateKey();

  const [invoicesRes, paymentsRes, quotesRes, jobsRes, timesheetsRes, posRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, due_date, issue_date, total, amount_paid, status, customer:customers(display_name)")
      .neq("status", "draft")
      .is("deleted_at", null),
    supabase.from("payments").select("amount, paid_date").gte("paid_date", monthStart),
    supabase
      .from("quotes")
      .select("id, grand_total, status, sent_at, accepted_at")
      .is("deleted_at", null)
      .gte("created_at", daysAgo(90)),
    supabase
      .from("jobs")
      .select("id, job_number, job_name, status, estimated_value, job_costs(total)")
      .is("deleted_at", null)
      .in("status", ["in_progress", "on_hold", "awaiting_materials", "awaiting_customer", "completed", "invoiced"]),
    supabase
      .from("timesheets")
      .select("profile_id, duration_minutes, started_at, profile:profiles(full_name)")
      .gte("started_at", weekStart)
      .not("duration_minutes", "is", null),
    supabase
      .from("purchase_orders")
      .select("grand_total")
      .in("status", ["draft", "awaiting_approval", "approved", "sent", "partially_received"]),
  ]);

  const invoices = invoicesRes.data ?? [];
  const revenueThisMonth = invoices
    .filter((inv) => inv.issue_date >= monthStart)
    .reduce((sum, inv) => sum + Number(inv.total), 0);
  const paidThisMonth = (paymentsRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const outstandingBalance = invoices
    .filter((inv) => inv.status !== "void")
    .reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)), 0);

  const overdueRows = invoices.filter((inv) => inv.status === "overdue" || (inv.due_date < today && !["paid", "void"].includes(inv.status)));
  const overdueInvoices: OverdueInvoiceRow[] = overdueRows
    .map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      customer_name: (inv.customer as unknown as { display_name: string } | null)?.display_name ?? "—",
      due_date: inv.due_date,
      outstanding: Number(inv.total) - Number(inv.amount_paid),
    }))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const overdueInvoicesValue = overdueInvoices.reduce((sum, r) => sum + r.outstanding, 0);

  const quotes = quotesRes.data ?? [];
  const outstandingQuotes = quotes.filter((q) => q.status === "sent" || q.status === "viewed");
  const outstandingQuotesValue = outstandingQuotes.reduce((sum, q) => sum + Number(q.grand_total), 0);
  const quotesSentLast90 = quotes.filter((q) => q.sent_at).length;
  const quotesAcceptedLast90 = quotes.filter((q) => q.accepted_at).length;

  const jobProfitability: JobProfitabilityRow[] = (jobsRes.data ?? [])
    .map((job) => {
      const costs = (job.job_costs as unknown as { total: number }[] | null) ?? [];
      const actualCost = costs.reduce((sum, c) => sum + Number(c.total), 0);
      const estimatedValue = Number(job.estimated_value ?? 0);
      return {
        id: job.id,
        job_number: job.job_number,
        job_name: job.job_name,
        status: job.status,
        estimated_value: estimatedValue,
        actual_cost: actualCost,
        margin: estimatedValue - actualCost,
      };
    })
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 10);

  const hoursByProfile = new Map<string, StaffHoursRow>();
  for (const row of timesheetsRes.data ?? []) {
    const minutes = Number(row.duration_minutes ?? 0);
    const fullName = (row.profile as unknown as { full_name: string } | null)?.full_name ?? "Unknown";
    const existing = hoursByProfile.get(row.profile_id);
    if (existing) {
      existing.minutes += minutes;
    } else {
      hoursByProfile.set(row.profile_id, { profile_id: row.profile_id, full_name: fullName, minutes });
    }
  }
  const staffHoursThisWeek = [...hoursByProfile.values()].sort((a, b) => b.minutes - a.minutes);

  const openPurchaseOrdersValue = (posRes.data ?? []).reduce((sum, po) => sum + Number(po.grand_total), 0);

  return {
    revenueThisMonth,
    paidThisMonth,
    outstandingBalance,
    overdueInvoicesCount: overdueInvoices.length,
    overdueInvoicesValue,
    overdueInvoices,
    outstandingQuotesValue,
    outstandingQuotesCount: outstandingQuotes.length,
    quotesSentLast90,
    quotesAcceptedLast90,
    jobProfitability,
    staffHoursThisWeek,
    openPurchaseOrdersValue,
  };
}
