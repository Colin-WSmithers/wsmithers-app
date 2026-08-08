"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { jobSchema, jobStatusUpdateSchema, jobAssignmentSchema, jobSubcontractorAssignmentSchema } from "@/lib/validation/jobs";
import type { Job } from "@/lib/supabase/types";
import { notifyProfile, notifyProfiles } from "@/lib/data/notifications";

export interface FormState {
  error?: string;
  values?: Record<string, string | string[]>;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

/** Echo submitted fields back so the form can restore them after a failed submit,
 * instead of the page re-render wiping everything the user typed. */
function valuesFromFormData(formData: FormData): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key);
    values[key] = all.length > 1 ? all.map(String) : String(all[0] ?? "");
  }
  return values;
}

export async function createJobAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  const values = valuesFromFormData(formData);
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to create jobs.", values };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = jobSchema.safeParse({
    ...raw,
    assigned_staff: formData.getAll("assigned_staff"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", values };
  }

  const supabase = await createClient();

  const { data: jobNumber, error: numberError } = await supabase.rpc("next_document_number", {
    p_kind: "job",
  });
  if (numberError || !jobNumber) {
    return { error: "Could not generate a job number — please try again.", values };
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      job_number: jobNumber,
      job_name: parsed.data.job_name,
      customer_id: parsed.data.customer_id,
      site_id: emptyToNull(parsed.data.site_id),
      description: emptyToNull(parsed.data.description),
      status: parsed.data.status,
      start_date: emptyToNull(parsed.data.start_date),
      expected_completion_date: emptyToNull(parsed.data.expected_completion_date),
      estimated_value: parsed.data.estimated_value,
      estimated_cost: parsed.data.estimated_cost,
    })
    .select("id")
    .single();

  if (error || !job) {
    return { error: "Could not create the job — please try again.", values };
  }

  if (parsed.data.assigned_staff.length > 0) {
    const { error: assignError } = await supabase.from("job_assignments").insert(
      parsed.data.assigned_staff.map((profileId) => ({
        job_id: job.id,
        profile_id: profileId,
      }))
    );
    if (!assignError) {
      await notifyProfiles(parsed.data.assigned_staff, {
        title: `You've been assigned to ${jobNumber}`,
        body: parsed.data.job_name,
        linkPath: `/jobs/${job.id}`,
      });
    }
  }

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

export async function updateJobStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to update job status." };
  }

  const parsed = jobStatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const update: Partial<Job> = { status: parsed.data.status };
  if (parsed.data.status === "completed") {
    update.actual_completion_date = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("jobs").update(update).eq("id", parsed.data.id);
  if (error) {
    return { error: "Could not update status — please try again." };
  }

  revalidatePath(`/jobs/${parsed.data.id}`);
  revalidatePath("/jobs");
  return {};
}

export async function addJobAssignmentAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to assign staff." };
  }

  const parsed = jobAssignmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("job_assignments").insert({
    job_id: parsed.data.job_id,
    profile_id: parsed.data.profile_id,
    role_on_job: emptyToNull(parsed.data.role_on_job),
  });

  if (error) {
    return { error: error.code === "23505" ? "That person is already assigned to this job." : "Could not assign — please try again." };
  }

  const { data: job } = await supabase.from("jobs").select("job_number, job_name").eq("id", parsed.data.job_id).single();
  if (job) {
    await notifyProfile({
      profileId: parsed.data.profile_id,
      title: `You've been assigned to ${job.job_number}`,
      body: job.job_name,
      linkPath: `/jobs/${parsed.data.job_id}`,
    });
  }

  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return {};
}

export async function addJobSubcontractorAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to assign subcontractors." };
  }

  const parsed = jobSubcontractorAssignmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("job_assignments").insert({
    job_id: parsed.data.job_id,
    subcontractor_id: parsed.data.subcontractor_id,
    role_on_job: emptyToNull(parsed.data.role_on_job),
  });

  if (error) {
    return { error: "Could not assign — please try again." };
  }

  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return {};
}

export async function removeJobAssignmentAction(assignmentId: string, jobId: string): Promise<void> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) return;

  const supabase = await createClient();
  await supabase.from("job_assignments").delete().eq("id", assignmentId);
  revalidatePath(`/jobs/${jobId}`);
}
