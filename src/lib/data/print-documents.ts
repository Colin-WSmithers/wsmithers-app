import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Data for the printable/PDF versions of a quote or invoice. These are the
 * documents that actually go to a customer, so everything on the page —
 * company details, VAT number, terms, payment details — comes from
 * company_settings rather than being hard-coded.
 */

export interface PrintCompany {
  company_name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  company_number: string | null;
  vat_number: string | null;
  quote_terms: string | null;
  invoice_terms: string | null;
  payment_details: string | null;
}

export interface PrintParty {
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_postcode: string | null;
}

export interface PrintSite {
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string | null;
  postcode: string;
}

export interface PrintLine {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  vat_rate: number;
  line_total: number;
}

export interface PrintQuote {
  kind: "quote";
  id: string;
  number: string;
  status: string;
  issue_date: string;
  expiry_date: string | null;
  description: string | null;
  notes: string | null;
  terms: string | null;
  discount_amount: number;
  subtotal: number;
  vat_total: number;
  total: number;
  customer: PrintParty | null;
  site: PrintSite | null;
  lines: PrintLine[];
  company: PrintCompany | null;
}

export interface PrintInvoice {
  kind: "invoice";
  id: string;
  number: string;
  status: string;
  issue_date: string;
  due_date: string;
  notes: string | null;
  terms: string | null;
  subtotal: number;
  vat_total: number;
  total: number;
  amount_paid: number;
  customer: PrintParty | null;
  site: PrintSite | null;
  lines: PrintLine[];
  company: PrintCompany | null;
  payments: { id: string; amount: number; paid_date: string; method: string; reference: string | null }[];
}

export interface PrintPurchaseOrder {
  kind: "purchase_order";
  id: string;
  number: string;
  status: string;
  issue_date: string;
  expected_delivery_date: string | null;
  notes: string | null;
  subtotal: number;
  vat_total: number;
  total: number;
  supplier: {
    name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    account_number: string | null;
  } | null;
  job: { job_number: string; job_name: string } | null;
  deliverTo: PrintSite | null;
  lines: PrintLine[];
  company: PrintCompany | null;
}

const COMPANY_FIELDS =
  "company_name, address_line1, address_line2, city, postcode, phone, email, company_number, vat_number, quote_terms, invoice_terms, payment_details";

const CUSTOMER_FIELDS =
  "display_name, company_name, email, phone, billing_address_line1, billing_address_line2, billing_city, billing_postcode";

const SITE_FIELDS = "label, address_line1, address_line2, city, postcode";

async function getCompany(): Promise<PrintCompany | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_settings").select(COMPANY_FIELDS).limit(1).maybeSingle();
  return (data as PrintCompany | null) ?? null;
}

export async function getQuoteForPrint(id: string): Promise<PrintQuote | null> {
  const supabase = await createClient();
  const [{ data }, company] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        `id, quote_number, status, issue_date, expiry_date, description, notes, terms,
         discount_amount, subtotal, vat_total, grand_total,
         customer:customers(${CUSTOMER_FIELDS}),
         site:sites(${SITE_FIELDS}),
         items:quote_items(id, sort_order, description, quantity, unit, unit_price, vat_rate, line_total)`
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    getCompany(),
  ]);

  if (!data) return null;
  const row = data as unknown as {
    id: string; quote_number: string; status: string; issue_date: string; expiry_date: string | null;
    description: string | null; notes: string | null; terms: string | null;
    discount_amount: number; subtotal: number; vat_total: number; grand_total: number;
    customer: PrintParty | null; site: PrintSite | null;
    items: (PrintLine & { sort_order: number })[];
  };

  return {
    kind: "quote",
    id: row.id,
    number: row.quote_number,
    status: row.status,
    issue_date: row.issue_date,
    expiry_date: row.expiry_date,
    description: row.description,
    notes: row.notes,
    terms: row.terms,
    discount_amount: Number(row.discount_amount),
    subtotal: Number(row.subtotal),
    vat_total: Number(row.vat_total),
    total: Number(row.grand_total),
    customer: row.customer,
    site: row.site,
    lines: [...(row.items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    company,
  };
}

export async function getPurchaseOrderForPrint(id: string): Promise<PrintPurchaseOrder | null> {
  const supabase = await createClient();
  const [{ data }, company] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(
        `id, po_number, status, issue_date, expected_delivery_date, notes,
         subtotal, vat_total, grand_total,
         supplier:suppliers(name, contact_name, email, phone, address, account_number),
         job:jobs(job_number, job_name, site:sites(${SITE_FIELDS})),
         items:purchase_order_items(id, description, quantity, unit_price, vat_rate, line_total)`
      )
      .eq("id", id)
      .maybeSingle(),
    getCompany(),
  ]);

  if (!data) return null;
  const row = data as unknown as {
    id: string; po_number: string; status: string; issue_date: string;
    expected_delivery_date: string | null; notes: string | null;
    subtotal: number; vat_total: number; grand_total: number;
    supplier: PrintPurchaseOrder["supplier"];
    job: ({ job_number: string; job_name: string; site: PrintSite | null }) | null;
    items: Omit<PrintLine, "unit">[];
  };

  return {
    kind: "purchase_order",
    id: row.id,
    number: row.po_number,
    status: row.status,
    issue_date: row.issue_date,
    expected_delivery_date: row.expected_delivery_date,
    notes: row.notes,
    subtotal: Number(row.subtotal),
    vat_total: Number(row.vat_total),
    total: Number(row.grand_total),
    supplier: row.supplier,
    job: row.job ? { job_number: row.job.job_number, job_name: row.job.job_name } : null,
    // Materials go to the site the job is on, when there is one.
    deliverTo: row.job?.site ?? null,
    lines: (row.items ?? []).map((i) => ({ ...i, unit: null })),
    company,
  };
}

export async function getInvoiceForPrint(id: string): Promise<PrintInvoice | null> {
  const supabase = await createClient();
  const [{ data }, company] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        `id, invoice_number, status, issue_date, due_date, notes, terms,
         subtotal, vat_total, total, amount_paid,
         customer:customers(${CUSTOMER_FIELDS}),
         site:sites(${SITE_FIELDS}),
         items:invoice_items(id, sort_order, description, quantity, unit_price, vat_rate, line_total),
         payments(id, amount, paid_date, method, reference)`
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    getCompany(),
  ]);

  if (!data) return null;
  const row = data as unknown as {
    id: string; invoice_number: string; status: string; issue_date: string; due_date: string;
    notes: string | null; terms: string | null;
    subtotal: number; vat_total: number; total: number; amount_paid: number;
    customer: PrintParty | null; site: PrintSite | null;
    items: (Omit<PrintLine, "unit"> & { sort_order: number })[];
    payments: { id: string; amount: number; paid_date: string; method: string; reference: string | null }[];
  };

  return {
    kind: "invoice",
    id: row.id,
    number: row.invoice_number,
    status: row.status,
    issue_date: row.issue_date,
    due_date: row.due_date,
    notes: row.notes,
    terms: row.terms,
    subtotal: Number(row.subtotal),
    vat_total: Number(row.vat_total),
    total: Number(row.total),
    amount_paid: Number(row.amount_paid),
    customer: row.customer,
    site: row.site,
    lines: [...(row.items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ ...i, unit: null })),
    payments: [...(row.payments ?? [])].sort((a, b) => a.paid_date.localeCompare(b.paid_date)),
    company,
  };
}
