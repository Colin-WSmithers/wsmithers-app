"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { appointmentSchema, appointmentStatusUpdateSchema } from "@/lib/validation/appointments";
import { findOverlappingAssignments } from "@/lib/data/schedule";
import { notifyProfiles } from "@/lib/data/notifications";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function createAppointmentAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to schedule appointments." };
  }

  const parsed = appointmentSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    assigned_staff: formData.getAll("assigned_staff"),
    assigned_subcontractors: formData.getAll("assigned_subcontractors"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const startsAtISO = new Date(parsed.data.starts_at).toISOString();
  const endsAtISO = new Date(parsed.data.ends_at).toISOString();

  if (parsed.data.assigned_staff.length > 0) {
    const conflicts = await findOverlappingAssignments(parsed.data.assigned_staff, startsAtISO, endsAtISO);
    if (conflicts.length > 0) {
      const names = [...new Set(conflicts.map((c) => c.fullName))].join(", ");
      return { error: `${names} already ${conflicts.length > 1 ? "have" : "has"} an appointment that overlaps this time.` };
    }
  }

  const supabase = await createClient();

  const { data: job } = await supabase.from("jobs").select("site_id").eq("id", parsed.data.job_id).single();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      job_id: parsed.data.job_id,
      site_id: job?.site_id ?? null,
      title: emptyToNull(parsed.data.title),
      description: emptyToNull(parsed.data.description),
      starts_at: startsAtISO,
      ends_at: endsAtISO,
      notes: emptyToNull(parsed.data.notes),
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    return { error: "Could not create the appointment — please try again." };
  }

  const assignmentRows = [
    ...parsed.data.assigned_staff.map((profileId) => ({ appointment_id: appointment.id, profile_id: profileId })),
    ...parsed.data.assigned_subcontractors.map((subcontractorId) => ({
      appointment_id: appointment.id,
      subcontractor_id: subcontractorId,
    })),
  ];
  if (assignmentRows.length > 0) {
    await supabase.from("appointment_assignments").insert(assignmentRows);
  }

  if (parsed.data.assigned_staff.length > 0) {
    const { data: job } = await supabase.from("jobs").select("job_number").eq("id", parsed.data.job_id).single();
    const when = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(startsAtISO));
    await notifyProfiles(parsed.data.assigned_staff, {
      title: `New appointment on ${job?.job_number ?? "a job"}`,
      body: `${when}${parsed.data.title ? ` — ${parsed.data.title}` : ""}`,
      linkPath: "/schedule",
    });
  }

  revalidatePath("/schedule");
  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return {};
}

export async function updateAppointmentStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to update appointments." };
  }

  const parsed = appointmentStatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) {
    return { error: "Could not update the appointment — please try again." };
  }

  revalidatePath("/schedule");
  return {};
}

export async function deleteAppointmentAction(appointmentId: string): Promise<void> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) return;

  const supabase = await createClient();
  await supabase.from("appointments").delete().eq("id", appointmentId);
  revalidatePath("/schedule");
}
