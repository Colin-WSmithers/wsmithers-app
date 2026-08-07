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

  const items = parseLineItemRows(formData, {
    description: "line_description",
    quantity: "line_quantity",
    unitPrice: "line_unit_price",
    vatRate: "line_vat_rate",
    unit: "line_unit",
    category: "line_category",
  });
  if (items.length === 0) {
    return { error: "Add at least one line item." };
  }

  const { subtotal: itemsSubtotal, vat_total, grand_total: itemsGrandTotal } = sumLineItems(items);
  const subtotal = Math.round((itemsSubtotal - parsed.data.discount_amount) * 100) / 100;
  const grand_total = Math.round((itemsGrandTotal - parsed.data.discount_amount) * 100) / 100;

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

  await supabase.from("quote_items").insert(
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

  const supabase = await createClient();
  const update: Partial<Quote> = { status: parsed.data.status };
  const now = new Date().toISOString();
  if (parsed.data.status === "sent") update.sent_at = now;
  if (parsed.data.status === "viewed") update.viewed_at = now;
  if (parsed.data.status === "rejected") update.rejected_at = now;

  const { error } = await supabase.from("quotes").update(update).eq("id", parsed.data.id);
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
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
  if (!quote) {
    return { error: "Quote not found." };
  }

  if (quote.converted_job_id) {
    redirect(`/jobs/${quote.converted_job_id}`);
  }

  const { data: jobNumber, error: numberError } = await supabase.rpc("next_document_number", { p_kind: "job" });
  if (numberError || !jobNumber) {
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
    return { error: "Could not create the job from this quote — please try again." };
  }

  const now = new Date().toISOString();
  await supabase
    .from("quotes")
    .update({ status: "accepted", accepted_at: now, converted_job_id: job.id })
    .eq("id", quoteId);

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
