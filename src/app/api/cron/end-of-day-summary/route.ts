import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { londonDateKey, londonDayRange } from "@/lib/utils";

/**
 * Vercel Cron route — builds a one-day activity snapshot from the database,
 * asks Claude to turn it into a short plain-English recap, and stores it in
 * `daily_summaries` (one row per day) so the dashboard can show "today's
 * summary" without re-querying/re-generating on every page load. Also drops
 * a notification for office/admin staff once it's ready.
 *
 * Scheduled daily via vercel.json, after the working day ends. Protected
 * the same way as /api/cron/mark-overdue — see that route/README for the
 * CRON_SECRET explanation.
 *
 * Real numbers only: every figure quoted to Claude comes straight out of
 * the database for the day in question. If a section has nothing to report
 * it's just omitted from the stats payload — Claude is instructed not to
 * invent activity that didn't happen.
 */

/**
 * The working day is a London day, not a UTC one. During BST these differ by
 * an hour, which would otherwise push early-morning timesheets and late
 * appointments into the wrong day's summary.
 */
function dayRange(dateStr: string): { start: string; end: string } {
  const { start, end } = londonDayRange(dateStr);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function buildSnapshot(dateStr: string) {
  const supabase = createAdminClient();
  const { start, end } = dayRange(dateStr);

  const [
    jobsCompleted,
    jobsStarted,
    tasksCompleted,
    notesAdded,
    photosUploaded,
    appointmentsToday,
    timesheetsToday,
    quotesSent,
    quotesAccepted,
    invoicesSent,
    paymentsToday,
    costsToday,
    enquiriesToday,
    overdueInvoices,
  ] = await Promise.all([
    supabase.from("jobs").select("job_number, job_name", { count: "exact" }).eq("actual_completion_date", dateStr),
    supabase.from("jobs").select("job_number, job_name", { count: "exact" }).eq("start_date", dateStr),
    supabase.from("job_tasks").select("title", { count: "exact" }).eq("status", "completed").gte("updated_at", start).lte("updated_at", end),
    supabase.from("job_notes").select("id", { count: "exact" }).gte("created_at", start).lte("created_at", end),
    supabase.from("job_photos").select("id", { count: "exact" }).gte("created_at", start).lte("created_at", end),
    supabase.from("appointments").select("status", { count: "exact" }).gte("starts_at", start).lte("starts_at", end),
    supabase.from("timesheets").select("duration_minutes").gte("started_at", start).lte("started_at", end).not("duration_minutes", "is", null),
    supabase.from("quotes").select("grand_total", { count: "exact" }).gte("sent_at", start).lte("sent_at", end),
    supabase.from("quotes").select("grand_total", { count: "exact" }).gte("accepted_at", start).lte("accepted_at", end),
    supabase.from("invoices").select("total", { count: "exact" }).gte("sent_at", start).lte("sent_at", end),
    supabase.from("payments").select("amount").gte("paid_date", dateStr).lte("paid_date", dateStr),
    supabase.from("job_costs").select("total").eq("incurred_date", dateStr),
    supabase.from("enquiries").select("id", { count: "exact" }).eq("date_received", dateStr),
    supabase.from("invoices").select("invoice_number, total, amount_paid").eq("status", "overdue"),
  ]);

  const totalHoursLogged = (timesheetsToday.data ?? []).reduce((sum, t) => sum + Number(t.duration_minutes ?? 0), 0) / 60;
  const appointmentsCompleted = (appointmentsToday.data ?? []).filter((a) => a.status === "completed").length;
  const quotesSentValue = (quotesSent.data ?? []).reduce((sum, q) => sum + Number(q.grand_total), 0);
  const quotesAcceptedValue = (quotesAccepted.data ?? []).reduce((sum, q) => sum + Number(q.grand_total), 0);
  const invoicesSentValue = (invoicesSent.data ?? []).reduce((sum, i) => sum + Number(i.total), 0);
  const paymentsReceivedValue = (paymentsToday.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const costsLoggedValue = (costsToday.data ?? []).reduce((sum, c) => sum + Number(c.total), 0);
  const overdueTotal = (overdueInvoices.data ?? []).reduce((sum, i) => sum + (Number(i.total) - Number(i.amount_paid)), 0);

  return {
    date: dateStr,
    jobs_completed: jobsCompleted.count ?? 0,
    jobs_completed_names: (jobsCompleted.data ?? []).map((j) => `${j.job_number} (${j.job_name})`),
    jobs_started: jobsStarted.count ?? 0,
    jobs_started_names: (jobsStarted.data ?? []).map((j) => `${j.job_number} (${j.job_name})`),
    tasks_completed: tasksCompleted.count ?? 0,
    notes_added: notesAdded.count ?? 0,
    photos_uploaded: photosUploaded.count ?? 0,
    appointments_scheduled: appointmentsToday.count ?? 0,
    appointments_completed: appointmentsCompleted,
    total_hours_logged: Math.round(totalHoursLogged * 10) / 10,
    quotes_sent_count: quotesSent.count ?? 0,
    quotes_sent_value: quotesSentValue,
    quotes_accepted_count: quotesAccepted.count ?? 0,
    quotes_accepted_value: quotesAcceptedValue,
    invoices_sent_count: invoicesSent.count ?? 0,
    invoices_sent_value: invoicesSentValue,
    payments_received_value: paymentsReceivedValue,
    costs_logged_value: costsLoggedValue,
    new_enquiries: enquiriesToday.count ?? 0,
    overdue_invoices_count: (overdueInvoices.data ?? []).length,
    overdue_invoices_total: overdueTotal,
  };
}

async function generateSummaryText(stats: Awaited<ReturnType<typeof buildSnapshot>>): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_SUMMARY_MODEL || "claude-sonnet-4-5-20250929";

  const message = await anthropic.messages.create({
    model,
    max_tokens: 500,
    system:
      "You write short end-of-day recaps for the office manager of a UK trades/building company (W Smithers and Sons). " +
      "You are given exact figures for one calendar day, pulled straight from their job management system. " +
      "Write 3-6 sentences of plain, friendly UK English prose (no headings, no bullet points, no markdown). " +
      "Only mention things that actually happened — a metric of 0 means it did not happen, so leave it out rather than saying 'no X happened'. " +
      "Money is in GBP; format as £1,234.56. Flag anything that needs attention (e.g. overdue invoices) at the end, briefly. " +
      "If almost everything is zero, it's fine to say it was a quiet day.",
    messages: [
      {
        role: "user",
        content: `Today's figures (${stats.date}):\n${JSON.stringify(stats, null, 2)}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text.trim() : "Summary could not be generated.";
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const dateStr = londonDateKey();
  const supabase = createAdminClient();

  let stats;
  try {
    stats = await buildSnapshot(dateStr);
  } catch {
    return NextResponse.json({ error: "Could not build today's activity snapshot" }, { status: 500 });
  }

  let content: string;
  try {
    content = await generateSummaryText(stats);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not generate summary" }, { status: 500 });
  }

  const { error: upsertError } = await supabase
    .from("daily_summaries")
    .upsert({ summary_date: dateStr, content, stats, generated_at: new Date().toISOString() }, { onConflict: "summary_date" });

  if (upsertError) {
    return NextResponse.json({ error: "Could not save the summary" }, { status: 500 });
  }

  const { data: officeStaff } = await supabase.from("profiles").select("id").in("role", ["admin", "office"]).eq("is_active", true);
  if (officeStaff && officeStaff.length > 0) {
    await supabase.from("notifications").insert(
      officeStaff.map((p) => ({
        profile_id: p.id,
        title: "Today's summary is ready",
        body: content.length > 120 ? `${content.slice(0, 117)}…` : content,
        link_path: "/dashboard",
      }))
    );
  }

  return NextResponse.json({ date: dateStr, saved: true });
}
