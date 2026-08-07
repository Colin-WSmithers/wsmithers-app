import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PoStatus, PurchaseOrderItem } from "@/lib/supabase/types";

export interface PurchaseOrderListRow {
  id: string;
  po_number: string;
  status: PoStatus;
  grand_total: number;
  issue_date: string;
  expected_delivery_date: string | null;
  supplier: { id: string; name: string } | null;
  job: { id: string; job_number: string } | null;
}

export async function listPurchaseOrders(): Promise<PurchaseOrderListRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("id, po_number, status, grand_total, issue_date, expected_delivery_date, supplier:suppliers(id, name), job:jobs(id, job_number)")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as PurchaseOrderListRow[];
}

export interface PurchaseOrderDetail {
  id: string;
  po_number: string;
  status: PoStatus;
  issue_date: string;
  expected_delivery_date: string | null;
  subtotal: number;
  vat_total: number;
  grand_total: number;
  notes: string | null;
  supplier: { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null } | null;
  job: { id: string; job_number: string; job_name: string } | null;
  items: PurchaseOrderItem[];
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrderDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select(
      `id, po_number, status, issue_date, expected_delivery_date, subtotal, vat_total, grand_total, notes,
       supplier:suppliers(id, name, contact_name, phone, email),
       job:jobs(id, job_number, job_name),
       items:purchase_order_items(*)`
    )
    .eq("id", id)
    .single();

  return (data as unknown as PurchaseOrderDetail) ?? null;
}
