import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { QuoteStatus, QuoteItem, QuoteItemTemplate } from "@/lib/supabase/types";

export interface QuoteListRow {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  grand_total: number;
  issue_date: string;
  expiry_date: string | null;
  customer: { id: string; display_name: string } | null;
}

export async function listQuotes(status?: QuoteStatus): Promise<QuoteListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("quotes")
    .select("id, quote_number, status, grand_total, issue_date, expiry_date, customer:customers(id, display_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  return (data ?? []) as unknown as QuoteListRow[];
}

export async function listQuotesForCustomer(customerId: string): Promise<QuoteListRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("id, quote_number, status, grand_total, issue_date, expiry_date, customer:customers(id, display_name)")
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as QuoteListRow[];
}

export interface QuoteDetail {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  issue_date: string;
  expiry_date: string | null;
  description: string | null;
  notes: string | null;
  terms: string | null;
  discount_amount: number;
  subtotal: number;
  vat_total: number;
  grand_total: number;
  converted_job_id: string | null;
  customer: { id: string; display_name: string; email: string | null; phone: string | null } | null;
  site: { label: string; address_line1: string; postcode: string } | null;
  items: QuoteItem[];
}

export async function getQuoteById(id: string): Promise<QuoteDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select(
      `id, quote_number, status, issue_date, expiry_date, description, notes, terms, discount_amount,
       subtotal, vat_total, grand_total, converted_job_id,
       customer:customers(id, display_name, email, phone),
       site:sites(label, address_line1, postcode),
       items:quote_items(*)`
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!data) return null;
  const detail = data as unknown as QuoteDetail;
  detail.items = [...detail.items].sort((a, b) => a.sort_order - b.sort_order);
  return detail;
}

export async function listQuoteItemTemplates(): Promise<QuoteItemTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("quote_item_templates").select("*").order("category", { ascending: true });
  return (data ?? []) as QuoteItemTemplate[];
}
