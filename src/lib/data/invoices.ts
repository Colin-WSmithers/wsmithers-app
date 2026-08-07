import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceStatus, InvoiceItem, Payment } from "@/lib/supabase/types";

export interface InvoiceListRow {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total: number;
  amount_paid: number;
  due_date: string;
  issue_date: string;
  customer: { id: string; display_name: string } | null;
  job: { id: string; job_number: string } | null;
}

export async function listInvoices(status?: InvoiceStatus): Promise<InvoiceListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, status, total, amount_paid, due_date, issue_date, customer:customers(id, display_name), job:jobs(id, job_number)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  return (data ?? []) as unknown as InvoiceListRow[];
}

export async function listInvoicesForCustomer(customerId: string): Promise<InvoiceListRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total, amount_paid, due_date, issue_date, customer:customers(id, display_name), job:jobs(id, job_number)")
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as InvoiceListRow[];
}

export interface InvoiceDetail {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  kind: string;
  issue_date: string;
  due_date: string;
  notes: string | null;
  terms: string | null;
  subtotal: number;
  vat_total: number;
  total: number;
  amount_paid: number;
  customer: { id: string; display_name: string; email: string | null; phone: string | null } | null;
  site: { label: string; address_line1: string; postcode: string } | null;
  job: { id: string; job_number: string; job_name: string } | null;
  items: InvoiceItem[];
  payments: Payment[];
}

export async function getInvoiceById(id: string): Promise<InvoiceDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      `id, invoice_number, status, kind, issue_date, due_date, notes, terms, subtotal, vat_total, total, amount_paid,
       customer:customers(id, display_name, email, phone),
       site:sites(label, address_line1, postcode),
       job:jobs(id, job_number, job_name),
       items:invoice_items(*),
       payments(*)`
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!data) return null;
  const detail = data as unknown as InvoiceDetail;
  detail.items = [...detail.items].sort((a, b) => a.sort_order - b.sort_order);
  detail.payments = [...detail.payments].sort(
    (a, b) => new Date(b.paid_date).getTime() - new Date(a.paid_date).getTime()
  );
  return detail;
}

/** Every unpaid invoice past its due date — used by the office dashboard and the overdue-marking cron. */
export async function listOverdueCandidates(): Promise<{ id: string; due_date: string; status: InvoiceStatus }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, due_date, status")
    .in("status", ["sent", "viewed", "part_paid"])
    .lt("due_date", new Date().toISOString().slice(0, 10))
    .is("deleted_at", null);
  return data ?? [];
}
