"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { subcontractorSchema } from "@/lib/validation/subcontractors";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function createSubcontractorAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to add subcontractors." };
  }

  const parsed = subcontractorSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("subcontractors").insert({
    name: parsed.data.name,
    company_name: emptyToNull(parsed.data.company_name),
    trade: emptyToNull(parsed.data.trade),
    phone: emptyToNull(parsed.data.phone),
    email: emptyToNull(parsed.data.email),
    day_rate: parsed.data.day_rate,
    hourly_rate: parsed.data.hourly_rate,
    notes: emptyToNull(parsed.data.notes),
  });

  if (error) {
    return { error: "Could not add the subcontractor — please try again." };
  }

  revalidatePath("/subcontractors");
  return {};
}

export async function toggleSubcontractorActiveAction(id: string, isActive: boolean): Promise<void> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) return;

  const supabase = await createClient();
  await supabase.from("subcontractors").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/subcontractors");
}
