"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { jobTaskSchema, jobTaskStatusUpdateSchema } from "@/lib/validation/job-tasks";
import { jobNoteSchema } from "@/lib/validation/job-notes";
import { jobPhotoMetaSchema, documentMetaSchema, MAX_UPLOAD_BYTES } from "@/lib/validation/documents";
import { jobCostSchema } from "@/lib/validation/job-costs";
import { notifyProfile } from "@/lib/data/notifications";

export interface FormState {
  error?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function createJobTaskAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to add tasks." };
  }

  const parsed = jobTaskSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const assignedTo = emptyToNull(parsed.data.assigned_to);
  const { error } = await supabase.from("job_tasks").insert({
    job_id: parsed.data.job_id,
    title: parsed.data.title,
    description: emptyToNull(parsed.data.description),
    assigned_to: assignedTo,
    due_date: emptyToNull(parsed.data.due_date),
    priority: parsed.data.priority,
    created_by: profile.id,
  });

  if (!error && assignedTo) {
    const { data: job } = await supabase.from("jobs").select("job_number").eq("id", parsed.data.job_id).single();
    await notifyProfile({
      profileId: assignedTo,
      title: `New task on ${job?.job_number ?? "a job"}`,
      body: parsed.data.title,
      linkPath: `/jobs/${parsed.data.job_id}`,
    });
  }

  if (error) {
    return { error: "Could not add the task — please try again." };
  }

  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return {};
}

/**
 * Office/admin can update any task; a tradesperson/subcontractor can only
 * update the status of a task assigned to them (checked explicitly here —
 * RLS additionally enforces they must be assigned to the *job* at all).
 */
export async function updateJobTaskStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  const parsed = jobTaskStatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();

  if (!isOfficeOrAdmin(profile.role)) {
    const { data: task } = await supabase
      .from("job_tasks")
      .select("assigned_to")
      .eq("id", parsed.data.id)
      .single();
    if (!task || task.assigned_to !== profile.id) {
      return { error: "You can only update tasks assigned to you." };
    }
  }

  const { error } = await supabase.from("job_tasks").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) {
    return { error: "Could not update the task — please try again." };
  }

  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return {};
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function addJobNoteAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();

  const parsed = jobNoteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a note before saving." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("job_notes").insert({
    job_id: parsed.data.job_id,
    body: parsed.data.body,
    author_id: profile.id,
  });

  if (error) {
    return { error: "Could not save the note — you may not have access to this job." };
  }

  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return {};
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function uploadJobPhotoAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();

  const parsed = jobPhotoMetaSchema.safeParse({
    job_id: formData.get("job_id"),
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That photo is too large (max 15MB)." };
  }
  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Please upload a JPEG, PNG, WEBP or HEIC photo." };
  }

  const supabase = await createClient();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${parsed.data.job_id}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("job-photos").upload(path, file, {
    contentType: file.type || "image/jpeg",
  });
  if (uploadError) {
    return { error: "Could not upload the photo — please try again." };
  }

  const { error: insertError } = await supabase.from("job_photos").insert({
    job_id: parsed.data.job_id,
    storage_path: path,
    category: parsed.data.category,
    description: emptyToNull(parsed.data.description),
    uploaded_by: profile.id,
  });

  if (insertError) {
    await supabase.storage.from("job-photos").remove([path]);
    return { error: "Could not save the photo — please try again." };
  }

  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return {};
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function uploadJobDocumentAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    return { error: "You do not have permission to upload documents." };
  }

  const parsed = documentMetaSchema.safeParse({
    job_id: formData.get("job_id"),
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That file is too large (max 15MB)." };
  }
  if (file.type && !ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { error: "Please upload a PDF, Word, Excel or image file." };
  }

  const jobId = emptyToNull(parsed.data.job_id);
  if (!jobId) {
    return { error: "A job is required." };
  }

  const supabase = await createClient();
  const path = `${jobId}/${randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) {
    return { error: "Could not upload the document — please try again." };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    job_id: jobId,
    customer_id: emptyToNull(parsed.data.customer_id),
    filename: file.name,
    storage_path: path,
    category: parsed.data.category,
    description: emptyToNull(parsed.data.description),
    uploaded_by: profile.id,
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([path]);
    return { error: "Could not save the document — please try again." };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/documents");
  return {};
}

// ---------------------------------------------------------------------------
// Job costs (materials/labour/subcontractor spend)
// ---------------------------------------------------------------------------

/**
 * Anyone assigned to the job can log a cost (e.g. a tradesperson buying
 * materials), but RLS means only office/admin can ever read costs back —
 * see job_costs_office_all / job_costs_assigned_insert in the migration.
 * Costs are stored ex-VAT (vat_rate kept alongside for reporting/reclaim).
 */
export async function addJobCostAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();

  const parsed = jobCostSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const total = Math.round(parsed.data.quantity * parsed.data.unit_cost * 100) / 100;

  const { error } = await supabase.from("job_costs").insert({
    job_id: parsed.data.job_id,
    category: parsed.data.category,
    item: parsed.data.item,
    quantity: parsed.data.quantity,
    unit_cost: parsed.data.unit_cost,
    vat_rate: parsed.data.vat_rate,
    total,
    incurred_date: emptyToNull(parsed.data.incurred_date) ?? new Date().toISOString().slice(0, 10),
    added_by: profile.id,
  });

  if (error) {
    return { error: "Could not log the cost — you may not be assigned to this job." };
  }

  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return {};
}
