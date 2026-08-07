"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageSettings } from "@/lib/data/auth";
import { staffUpdateSchema } from "@/lib/validation/staff";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function updateStaffAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!canManageSettings(profile.role)) {
    return { error: "Only admins can edit staff." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = staffUpdateSchema.safeParse({ ...raw, is_active: raw.is_active === "on" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  // An admin can't demote themselves out of admin — avoids locking everyone out.
  if (parsed.data.id === profile.id && parsed.data.role !== "admin") {
    return { error: "You can't change your own role away from admin." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      job_title: emptyToNull(parsed.data.job_title),
      phone: emptyToNull(parsed.data.phone),
      hourly_rate: parsed.data.hourly_rate,
      is_active: parsed.data.is_active ?? false,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "Could not update this profile — please try again." };
  }

  revalidatePath("/staff");
  return {};
}
