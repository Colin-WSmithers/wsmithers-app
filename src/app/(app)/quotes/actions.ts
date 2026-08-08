"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { quoteSchema, quoteStatusUpdateSchema } from "@/lib/validation/quotes";
import { parseLineItemRows, sumLineItems } from "@/lib/line-items";
import { notifyOffice } from "@/lib/data/notifications";
import type { Quote } from "@/lib/supabase/types";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function createQuoteAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to create quotes." };
  }

  const parsed = quoteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const { rows: items, error: itemsError } = parseLineItemRows(formData, {
    description: "line_description",
    quantity: "line_quantity",
    unitPrice: "line_unit_price",
    vatRate: "line_vat_rate",
    unit: "line_unit",
    category: "line_category",
  });
  if (itemsError) return { error: itemsError };
  if (items.length === 0) {
    return { error: "Add at least one line item." };
  }

  const { subtotal: itemsSubtotal, vat_total: itemsVat } = sumLineItems(items);
  const discount = parsed.data.discount_amount;
  if (discount > itemsSubtotal) {
    return { error: "The discount is larger than the quote total." };
  }

  // UK VAT is due on the discounted consideration, so scale VAT down in
  // proportion to the discount rather than charging VAT on the full subtotal
  // (which previously produced an effective rate above 20% on any discount).
  const subtotal = Math.round((itemsSubtotal - discount) * 100) / 100;
  const vat_total =
    itemsSubtotal > 0 ? Math.round(itemsVat * (subtotal / itemsSubtotal) * 100) / 100 : 0;
  const grand_total = Math.round((subtotal + vat_total) * 100) / 100;

  const supabase = await createClient();

  const { data: quoteNumber, error: numberError } = await supabase.rpc("next_document_number", { p_kind: "quote" });
  if (numberError || !quoteNumber) {
    return { error: "Could not generate a quote number — please try again." };
  }

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      quote_number: quoteNumber,
      customer_id: parsed.data.customer_id,
      site_id: emptyToNull(parsed.data.site_id),
      enquiry_id: emptyToNull(parsed.data.enquiry_id),
      description: emptyToNull(parsed.data.description),
      notes: emptyToNull(parsed.data.notes),
      terms: emptyToNull(parsed.data.terms),
      expiry_date: emptyToNull(parsed.data.expiry_date),
      discount_amount: parsed.data.discount_amount,
      subtotal,
      vat_total,
      grand_total,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !quote) {
    return { error: "Could not create the quote — please try again." };
  }

  // If the line items fail to save we'd be left with a quote showing a total
  // but no breakdown, so roll the parent back rather than reporting success.
  const { error: itemsInsertError } = await supabase.from("quote_items").insert(
    items.map((item, index) => ({
      quote_id: quote.id,
      sort_order: index,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit ?? "item",
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      line_total: item.line_total,
    }))
  );
  if (itemsInsertError) {
    await supabase.from("quotes").delete().eq("id", quote.id);
    return { error: "Could not save the quote's line items — please try again." };
  }

  if (parsed.data.enquiry_id) {
    await supabase
      .from("enquiries")
      .update({ converted_quote_id: quote.id, status: "quote_sent" })
      .eq("id", parsed.data.enquiry_id);
  }

  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuoteStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to update quotes." };
  }

  const parsed = quoteStatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  // 'accepted' is not a status you can simply set — it has to go through
  // acceptQuoteAction, which also creates the job and links the records.
  // Allowing it here produced accepted quotes with no job behind them.
  if (parsed.data.status === "accepted") {
    return { error: "Use “Accept quote” so the job is created and linked properly." };
  }

  const supabase = await createClient();
  const update: Partial<Quote> = { status: parsed.data.status };
  const now = new Date().toISOString();
  if (parsed.data.status === "sent") update.sent_at = now;
  if (parsed.data.status === "viewed") update.viewed_at = now;
  if (parsed.data.status === "rejected") update.rejected_at = now;

  const { error } = await supabase
    .from("quotes")
    .update(update)
    .eq("id", parsed.data.id)
    .neq("status", "accepted"); // don't unwind a quote that already became a job
  if (error) {
    return { error: "Could not update the quote — please try again." };
  }

  revalidatePath(`/quotes/${parsed.data.id}`);
  revalidatePath("/quotes");
  return {};
}

/**
 * The core "accepted quote becomes a job" flow: creates a real job from the
 * quote's customer/site/value, links both records together, and notifies
 * the office. Idempotent — if this quote already has a converted_job_id we
 * just redirect there instead of creating a duplicate job.
 */
export async function acceptQuoteAction(quoteId: string): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to accept quotes." };
  }

  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!quote) {
    return { error: "Quote not found." };
  }

  if (quote.converted_job_id) {
    redirect(`/jobs/${quote.converted_job_id}`);
  }

  if (quote.status === "rejected" || quote.status === "expired") {
    return { error: `This quote was ${quote.status} — reissue it before accepting.` };
  }

  // Claim the quote atomically FIRST. A read-then-write check loses a
  // double-click race: two requests both see converted_job_id = null and
  // create two jobs (burning two job numbers) for one quote. Whoever wins
  // this conditional update owns the conversion.
  const acceptedAt = new Date().toISOString();
  const { data: claimed } = await supabase
    .from("quotes")
    .update({ status: "accepted", accepted_at: acceptedAt })
    .eq("id", quoteId)
    .is("converted_job_id", null)
    .neq("status", "accepted")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    // Someone else got there first — send the user to the job they created.
    const { data: fresh } = await supabase
      .from("quotes")
      .select("converted_job_id")
      .eq("id", quoteId)
      .maybeSingle();
    if (fresh?.converted_job_id) redirect(`/jobs/${fresh.converted_job_id}`);
    return { error: "This quote is already being accepted — refresh the page." };
  }

  const { data: jobNumber, error: numberError } = await supabase.rpc("next_document_number", { p_kind: "job" });
  if (numberError || !jobNumber) {
    // Release the claim so the office can retry rather than being stuck with
    // an accepted quote and no job.
    await supabase.from("quotes").update({ status: quote.status, accepted_at: null }).eq("id", quoteId);
    return { error: "Could not generate a job number — please try again." };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      job_number: jobNumber,
      job_name: quote.description || `Job for quote ${quote.quote_number}`,
      customer_id: quote.customer_id,
      site_id: quote.site_id,
      quote_id: quote.id,
      description: quote.description,
      status: "draft",
      estimated_value: quote.grand_total,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    await supabase.from("quotes").update({ status: quote.status, accepted_at: null }).eq("id", quoteId);
    return { error: "Could not create the job from this quote — please try again." };
  }

  const { error: linkError } = await supabase
    .from("quotes")
    .update({ converted_job_id: job.id })
    .eq("id", quoteId);
  if (linkError) {
    // Don't leave an orphan job floating around with its own job number.
    await supabase.from("jobs").delete().eq("id", job.id);
    await supabase.from("quotes").update({ status: quote.status, accepted_at: null }).eq("id", quoteId);
    return { error: "Could not link the new job to this quote — please try again." };
  }

  if (quote.enquiry_id) {
    await supabase
      .from("enquiries")
      .update({ status: "won", converted_job_id: job.id })
      .eq("id", quote.enquiry_id);
  }

  await notifyOffice({
    title: `Quote ${quote.quote_number} accepted`,
    body: `${jobNumber} was created automatically — assign the crew when ready.`,
    linkPath: `/jobs/${job.id}`,
  });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  redirect(`/jobs/${job.id}`);
}

export async function acceptQuoteFormAction(quoteId: string, _formData: FormData): Promise<void> {
  const result = await acceptQuoteAction(quoteId);
  if (result.error) {
    redirect(`/quotes/${quoteId}?error=${encodeURIComponent(result.error)}`);
  }
}
