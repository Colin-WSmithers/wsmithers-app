"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { purchaseOrderSchema, poStatusUpdateSchema } from "@/lib/validation/purchase-orders";
import { parseLineItemRows, sumLineItems } from "@/lib/line-items";
import type { PurchaseOrder } from "@/lib/supabase/types";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function createPurchaseOrderAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to raise purchase orders." };
  }

  const parsed = purchaseOrderSchema.safeParse(Object.fromEntries(formData.entries()));
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

  const { data: poNumber, error: numberError } = await supabase.rpc("next_document_number", { p_kind: "po" });
  if (numberError || !poNumber) {
    return { error: "Could not generate a PO number — please try again." };
  }

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      po_number: poNumber,
      supplier_id: parsed.data.supplier_id,
      job_id: emptyToNull(parsed.data.job_id),
      expected_delivery_date: emptyToNull(parsed.data.expected_delivery_date),
      notes: emptyToNull(parsed.data.notes),
      subtotal,
      vat_total,
      grand_total,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !po) {
    return { error: "Could not create the purchase order — please try again." };
  }

  await supabase.from("purchase_order_items").insert(
    items.map((item) => ({
      purchase_order_id: po.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      line_total: item.line_total,
    }))
  );

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${po.id}`);
}

export async function updatePurchaseOrderStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to update purchase orders." };
  }

  const parsed = poStatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const update: Partial<PurchaseOrder> = { status: parsed.data.status };
  if (parsed.data.status === "approved") {
    update.approved_by = profile.id;
    update.approved_at = new Date().toISOString();
  }

  const { error } = await supabase.from("purchase_orders").update(update).eq("id", parsed.data.id);
  if (error) {
    return { error: "Could not update the purchase order — please try again." };
  }

  revalidatePath(`/purchase-orders/${parsed.data.id}`);
  revalidatePath("/purchase-orders");
  return {};
}
