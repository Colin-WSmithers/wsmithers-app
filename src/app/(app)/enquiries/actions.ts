"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { enquirySchema, enquiryStatusUpdateSchema } from "@/lib/validation/enquiries";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined | null) {
  return value && value.trim() !== "" ? value : null;
}

export async function createEnquiryAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to log enquiries." };
  }

  const parsed = enquirySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      first_name: emptyToNull(parsed.data.first_name),
      last_name: emptyToNull(parsed.data.last_name),
      company_name: emptyToNull(parsed.data.company_name),
      email: emptyToNull(parsed.data.email),
      phone: emptyToNull(parsed.data.phone),
      site_address: emptyToNull(parsed.data.site_address),
      source: emptyToNull(parsed.data.source),
      description: emptyToNull(parsed.data.description),
      estimated_value: parsed.data.estimated_value ?? null,
      date_received: parsed.data.date_received,
      assigned_to: emptyToNull(parsed.data.assigned_to),
      next_action_date: emptyToNull(parsed.data.next_action_date),
      notes: emptyToNull(parsed.data.notes),
      status: parsed.data.status,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not create enquiry — please try again." };
  }

  revalidatePath("/enquiries");
  redirect(`/enquiries/${data.id}`);
}

export async function updateEnquiryStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to update enquiries." };
  }

  const parsed = enquiryStatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("enquiries")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "Could not update status — please try again." };
  }

  revalidatePath(`/enquiries/${parsed.data.id}`);
  revalidatePath("/enquiries");
  return {};
}

/**
 * Bound as a form action (see convert-button.tsx) via
 * `convertEnquiryToCustomerFormAction.bind(null, enquiryId)`. Form actions
 * must return void/Promise<void>, so this thin wrapper adapts the real
 * implementation below — errors surface via a redirect with a query param
 * rather than a return value, since there's no client state to read one.
 */
export async function convertEnquiryToCustomerFormAction(enquiryId: string, _formData: FormData): Promise<void> {
  const result = await convertEnquiryToCustomerAction(enquiryId);
  if (result.error) {
    redirect(`/enquiries/${enquiryId}?convertError=${encodeURIComponent(result.error)}`);
  }
}

export async function convertEnquiryToCustomerAction(enquiryId: string): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to convert enquiries." };
  }

  const supabase = await createClient();
  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", enquiryId)
    .single();

  if (!enquiry) {
    return { error: "Enquiry not found." };
  }

  if (enquiry.converted_customer_id) {
    // Already converted — nothing to do, avoid creating a duplicate customer.
    return {};
  }

  const displayName =
    enquiry.company_name ||
    [enquiry.first_name, enquiry.last_name].filter(Boolean).join(" ") ||
    "New customer";

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      display_name: displayName,
      company_name: enquiry.company_name,
      first_name: enquiry.first_name,
      last_name: enquiry.last_name,
      email: enquiry.email,
      phone: enquiry.phone,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    return { error: "Could not create the customer — please try again." };
  }

  const { error: updateError } = await supabase
    .from("enquiries")
    .update({ customer_id: customer.id, converted_customer_id: customer.id })
    .eq("id", enquiryId);

  if (updateError) {
    return { error: "Customer was created, but the enquiry couldn't be linked to it — please contact support." };
  }

  revalidatePath(`/enquiries/${enquiryId}`);
  redirect(`/customers/${customer.id}`);
}
