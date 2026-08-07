"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageSettings } from "@/lib/data/auth";
import { companySettingsSchema } from "@/lib/validation/settings";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

export async function updateCompanySettingsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const profile = await requireProfile();

  // Server-side permission check — never rely on the UI hiding the form.
  if (!canManageSettings(profile.role)) {
    return { error: "You do not have permission to update company settings." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = companySettingsSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("company_settings").select("id").limit(1).single();

  if (!existing) {
    return { error: "Company settings record not found. Contact support." };
  }

  const { error } = await supabase
    .from("company_settings")
    .update(parsed.data)
    .eq("id", existing.id);

  if (error) {
    return { error: "Could not save settings — please try again." };
  }

  revalidatePath("/settings");
  return { success: true };
}
