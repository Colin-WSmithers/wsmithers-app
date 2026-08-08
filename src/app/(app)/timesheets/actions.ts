"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { getOpenTimesheet } from "@/lib/data/timesheets";
import { startShiftSchema, endShiftSchema, manualTimesheetSchema, approveTimesheetSchema } from "@/lib/validation/timesheets";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function startShiftAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();

  const parsed = startShiftSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a job." };
  }

  const alreadyOpen = await getOpenTimesheet(profile.id);
  if (alreadyOpen) {
    return { error: `You're already clocked in on ${alreadyOpen.job?.job_number ?? "a job"} — end that shift first.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("timesheets").insert({
    job_id: parsed.data.job_id,
    profile_id: profile.id,
    started_at: new Date().toISOString(),
  });

  if (error) {
    return { error: "Could not clock in — you may not be assigned to this job." };
  }

  revalidatePath("/timesheets");
  revalidatePath("/today");
  return {};
}

export async function endShiftAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();

  const parsed = endShiftSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Could not end the shift — please try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("timesheets")
    .update({
      ended_at: new Date().toISOString(),
      break_minutes: parsed.data.break_minutes,
    })
    .eq("id", parsed.data.id)
    .eq("profile_id", profile.id);

  if (error) {
    return { error: "Could not end the shift — please try again." };
  }

  revalidatePath("/timesheets");
  revalidatePath("/today");
  return {};
}

export async function addManualTimesheetAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();

  const parsed = manualTimesheetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("timesheets").insert({
    job_id: parsed.data.job_id,
    profile_id: profile.id,
    started_at: new Date(parsed.data.started_at).toISOString(),
    ended_at: new Date(parsed.data.ended_at).toISOString(),
    break_minutes: parsed.data.break_minutes,
    notes: emptyToNull(parsed.data.notes),
    is_manual_entry: true,
  });

  if (error) {
    return { error: "Could not save the entry — you may not be assigned to this job." };
  }

  revalidatePath("/timesheets");
  return {};
}

export async function approveTimesheetAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to approve timesheets." };
  }

  const parsed = approveTimesheetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const supabase = await createClient();

  // Four eyes: nobody signs off their own hours, office staff included.
  const { data: sheet } = await supabase
    .from("timesheets")
    .select("profile_id, ended_at")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!sheet) {
    return { error: "That timesheet no longer exists." };
  }
  if (sheet.profile_id === profile.id) {
    return { error: "You can't approve your own hours — ask a colleague to check them." };
  }
  if (!sheet.ended_at) {
    return { error: "That shift is still running — it can't be approved until it's clocked out." };
  }

  const { error } = await supabase
    .from("timesheets")
    .update({ is_approved: true, approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "Could not approve — please try again." };
  }

  revalidatePath("/timesheets");
  return {};
}
