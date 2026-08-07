"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { invoiceSchema, invoiceStatusUpdateSchema, paymentSchema } from "@/lib/validation/invoices";
import { parseLineItemRows, sumLineItems } from "@/lib/line-items";
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

  const items = parseLineItemRows(formData, {
    description: "line_description",
    quantity: "line_quantity",
    unitPrice: "line_unit_price",
    vatRate: "line_vat_rate",
  });
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

  await supabase.from("invoice_items").insert(
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

  const supabase = await createClient();
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
