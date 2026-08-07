"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { customerSchema, siteSchema, contactSchema } from "@/lib/validation/customers";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function createCustomerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to create customers." };
  }

  const parsed = customerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      display_name: parsed.data.display_name,
      company_name: emptyToNull(parsed.data.company_name),
      first_name: emptyToNull(parsed.data.first_name),
      last_name: emptyToNull(parsed.data.last_name),
      email: emptyToNull(parsed.data.email),
      phone: emptyToNull(parsed.data.phone),
      billing_address_line1: emptyToNull(parsed.data.billing_address_line1),
      billing_address_line2: emptyToNull(parsed.data.billing_address_line2),
      billing_city: emptyToNull(parsed.data.billing_city),
      billing_postcode: emptyToNull(parsed.data.billing_postcode),
      notes: emptyToNull(parsed.data.notes),
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not create customer — please try again." };
  }

  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

export async function addSiteAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to add sites." };
  }

  const parsed = siteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sites").insert({
    customer_id: parsed.data.customer_id,
    label: parsed.data.label,
    address_line1: parsed.data.address_line1,
    address_line2: emptyToNull(parsed.data.address_line2),
    city: emptyToNull(parsed.data.city),
    postcode: parsed.data.postcode,
    access_notes: emptyToNull(parsed.data.access_notes),
  });

  if (error) {
    return { error: "Could not add site — please try again." };
  }

  revalidatePath(`/customers/${parsed.data.customer_id}`);
  return {};
}

export async function addContactAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to add contacts." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = contactSchema.safeParse({ ...raw, is_primary: raw.is_primary === "on" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customer_contacts").insert({
    customer_id: parsed.data.customer_id,
    full_name: parsed.data.full_name,
    role: emptyToNull(parsed.data.role),
    email: emptyToNull(parsed.data.email),
    phone: emptyToNull(parsed.data.phone),
    is_primary: parsed.data.is_primary ?? false,
  });

  if (error) {
    return { error: "Could not add contact — please try again." };
  }

  revalidatePath(`/customers/${parsed.data.customer_id}`);
  return {};
}
