import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Enquiry, EnquiryStatus } from "@/lib/supabase/types";

export interface EnquiryListRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  estimated_value: number | null;
  date_received: string;
  status: EnquiryStatus;
  next_action_date: string | null;
  assigned_to_profile: { full_name: string } | null;
}

export async function listEnquiries(status?: EnquiryStatus): Promise<EnquiryListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("enquiries")
    .select(
      "id, first_name, last_name, company_name, email, phone, estimated_value, date_received, status, next_action_date, assigned_to_profile:profiles(full_name)"
    )
    .is("deleted_at", null)
    .order("date_received", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return (data ?? []) as unknown as EnquiryListRow[];
}

export async function getEnquiryById(id: string): Promise<Enquiry | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  return (data as Enquiry) ?? null;
}

export { listAssignableStaff } from "@/lib/data/staff";
