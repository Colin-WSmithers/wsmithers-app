import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Customer, CustomerContact, Site } from "@/lib/supabase/types";

export interface CustomerListRow {
  id: string;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  billing_city: string | null;
  billing_postcode: string | null;
  created_at: string;
  site_count: number;
}

/**
 * RLS handles the real access control: office/admin see every customer,
 * tradespeople/subcontractors only see customers tied to a job they're
 * assigned to (see customers_assigned_read policy in the migration).
 */
export async function listCustomers(search?: string): Promise<CustomerListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, display_name, company_name, email, phone, billing_city, billing_postcode, created_at, sites(id)")
    .is("deleted_at", null)
    .order("display_name", { ascending: true });

  if (search && search.trim()) {
    query = query.or(
      `display_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data } = await query;
  return (data ?? []).map((row) => {
    const { sites, ...rest } = row as unknown as CustomerListRow & { sites: { id: string }[] };
    return { ...rest, site_count: sites?.length ?? 0 };
  });
}

export interface CustomerDetail extends Customer {
  sites: Site[];
  contacts: CustomerContact[];
}

export async function getCustomerById(id: string): Promise<CustomerDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("*, sites(*), customer_contacts(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!data) return null;

  const { sites, customer_contacts, ...customer } = data as unknown as Customer & {
    sites: Site[];
    customer_contacts: CustomerContact[];
  };

  return { ...customer, sites: sites ?? [], contacts: customer_contacts ?? [] };
}

/** Lightweight list for pickers (e.g. "convert enquiry to job" customer select). */
export async function listCustomersForPicker(): Promise<{ id: string; display_name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, display_name")
    .is("deleted_at", null)
    .order("display_name", { ascending: true });
  return data ?? [];
}
