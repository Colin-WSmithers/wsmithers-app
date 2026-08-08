"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { invoiceSchema, invoiceStatusUpdateSchema, paymentSchema } from "@/lib/validation/invoices";
import { parseLineItemRows, sumLineItems } from "@/lib/line-items";
import { formatCurrencyGBP } from "@/lib/utils";
import type { Invoice } from "@/lib/supabase/types";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function createInvoiceAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to create invoices." };
  }

  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const { rows: items, error: itemsError } = parseLineItemRows(formData, {
    description: "line_description",
    quantity: "line_quantity",
    unitPrice: "line_unit_price",
    vatRate: "line_vat_rate",
  });
  if (itemsError) return { error: itemsError };
  if (items.length === 0) {
    return { error: "Add at least one line item." };
  }

  const { subtotal, vat_total, grand_total } = sumLineItems(items);
  const supabase = await createClient();

  const { data: invoiceNumber, error: numberError } = await supabase.rpc("next_document_number", { p_kind: "invoice" });
  if (numberError || !invoiceNumber) {
    return { error: "Could not generate an invoice number — please try again." };
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      customer_id: parsed.data.customer_id,
      site_id: emptyToNull(parsed.data.site_id),
      job_id: emptyToNull(parsed.data.job_id),
      kind: parsed.data.kind,
      due_date: parsed.data.due_date,
      notes: emptyToNull(parsed.data.notes),
      terms: emptyToNull(parsed.data.terms),
      subtotal,
      vat_total,
      total: grand_total,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    return { error: "Could not create the invoice — please try again." };
  }

  // An invoice with a total but no line items would go to a customer blank —
  // roll back rather than reporting success.
  const { error: itemsInsertError } = await supabase.from("invoice_items").insert(
    items.map((item, index) => ({
      invoice_id: invoice.id,
      sort_order: index,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      line_total: item.line_total,
    }))
  );
  if (itemsInsertError) {
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return { error: "Could not save the invoice's line items — please try again." };
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to update invoices." };
  }

  const parsed = invoiceStatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  // paid / part_paid / overdue are derived — the recalc_invoice_paid_status
  // trigger owns the first two and the nightly cron owns the third. Setting
  // them by hand would put the invoice and its payment ledger out of step.
  if (["paid", "part_paid", "overdue"].includes(parsed.data.status)) {
    return { error: "That status is set automatically from payments — record a payment instead." };
  }

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("amount_paid, status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!invoice) {
    return { error: "Invoice not found." };
  }
  if (parsed.data.status === "void" && Number(invoice.amount_paid) > 0) {
    return { error: "This invoice has payments recorded against it, so it can't be voided." };
  }

  const update: Partial<Invoice> = { status: parsed.data.status };
  if (parsed.data.status === "sent") update.sent_at = new Date().toISOString();

  const { error } = await supabase.from("invoices").update(update).eq("id", parsed.data.id);
  if (error) {
    return { error: "Could not update the invoice — please try again." };
  }

  revalidatePath(`/invoices/${parsed.data.id}`);
  revalidatePath("/invoices");
  return {};
}

/**
 * Recording a payment is all this needs to do — the recalc_invoice_paid_status
 * trigger (0001 migration) automatically updates invoices.amount_paid and
 * flips status to part_paid/paid based on the new payments total.
 */
export async function recordPaymentAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to record payments." };
  }

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();

  // Guard the ledger: no paying a void/draft invoice, and no overpayment
  // (which would silently corrupt aged-debt and VAT reporting, with no
  // delete-payment action available to undo it).
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total, amount_paid, status")
    .eq("id", parsed.data.invoice_id)
    .maybeSingle();
  if (!invoice) {
    return { error: "Invoice not found." };
  }
  if (invoice.status === "void") {
    return { error: "This invoice has been voided — no payments can be recorded against it." };
  }
  if (invoice.status === "draft") {
    return { error: "Send the invoice before recording a payment against it." };
  }
  const outstanding = Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100) / 100;
  if (outstanding <= 0) {
    return { error: "This invoice is already paid in full." };
  }
  if (parsed.data.amount > outstanding) {
    return { error: `That's more than the ${formatCurrencyGBP(outstanding)} outstanding on this invoice.` };
  }

  const { error } = await supabase.from("payments").insert({
    invoice_id: parsed.data.invoice_id,
    amount: parsed.data.amount,
    paid_date: parsed.data.paid_date,
    method: parsed.data.method,
    reference: emptyToNull(parsed.data.reference),
    notes: emptyToNull(parsed.data.notes),
    recorded_by: profile.id,
  });

  if (error) {
    return { error: "Could not record the payment — please try again." };
  }

  revalidatePath(`/invoices/${parsed.data.invoice_id}`);
  revalidatePath("/invoices");
  return {};
}
