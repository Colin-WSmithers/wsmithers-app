"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { supplierSchema } from "@/lib/validation/suppliers";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function createSupplierAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to add suppliers." };
  }

  const parsed = supplierSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert({
    name: parsed.data.name,
    contact_name: emptyToNull(parsed.data.contact_name),
    phone: emptyToNull(parsed.data.phone),
    email: emptyToNull(parsed.data.email),
    address: emptyToNull(parsed.data.address),
    account_number: emptyToNull(parsed.data.account_number),
    notes: emptyToNull(parsed.data.notes),
  });

  if (error) {
    return { error: "Could not add the supplier — please try again." };
  }

  revalidatePath("/purchase-orders");
  return {};
}
