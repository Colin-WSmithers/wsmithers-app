import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Vercel Cron route — flips any sent/viewed/part_paid invoice past its due
 * date to 'overdue' and notifies office/admin staff. Nothing else updates
 * invoices to 'overdue' (see recalc_invoice_paid_status in 0001_init.sql,
 * which only handles paid/part_paid on payment insert), so this is the only
 * place that transition happens.
 *
 * Scheduled daily via vercel.json. Protect it with CRON_SECRET: Vercel signs
 * cron requests with `Authorization: Bearer $CRON_SECRET` automatically once
 * that env var is set on the project — see README for setup.
 *
 * IMPORTANT: this only updates invoice status and creates an in-app
 * notification. It does NOT send an email/SMS — no email provider (e.g.
 * Resend/Postmark) is wired up in this app, so nothing here fakes sending a
 * message to the customer or to staff outside the app.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: overdue, error } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .in("status", ["sent", "viewed", "part_paid"])
    .lt("due_date", today)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: "Could not load candidate invoices" }, { status: 500 });
  }

  if (!overdue || overdue.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const ids = overdue.map((inv) => inv.id);
  const { error: updateError } = await supabase.from("invoices").update({ status: "overdue" }).in("id", ids);
  if (updateError) {
    return NextResponse.json({ error: "Could not update invoice status" }, { status: 500 });
  }

  const { data: officeStaff } = await supabase.from("profiles").select("id").in("role", ["admin", "office"]).eq("is_active", true);

  if (officeStaff && officeStaff.length > 0) {
    const title = overdue.length === 1
      ? `Invoice ${overdue[0].invoice_number} is now overdue`
      : `${overdue.length} invoices are now overdue`;
    const body = overdue.map((inv) => inv.invoice_number).slice(0, 5).join(", ") + (overdue.length > 5 ? "…" : "");

    await supabase.from("notifications").insert(
      officeStaff.map((p) => ({
        profile_id: p.id,
        title,
        body,
        link_path: "/invoices",
      }))
    );
  }

  return NextResponse.json({ updated: overdue.length });
}
