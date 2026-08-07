import { z } from "zod";

export const JOB_STATUSES = [
  "draft",
  "scheduled",
  "in_progress",
  "on_hold",
  "awaiting_materials",
  "awaiting_customer",
  "completed",
  "invoiced",
  "cancelled",
] as const;

export const jobSchema = z.object({
  customer_id: z.string().uuid("Choose a customer"),
  site_id: z.string().uuid().optional().or(z.literal("")),
  job_name: z.string().min(1, "Give the job a short name"),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(JOB_STATUSES),
  start_date: z.string().optional().or(z.literal("")),
  expected_completion_date: z.string().optional().or(z.literal("")),
  estimated_value: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  estimated_cost: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  assigned_staff: z.array(z.string().uuid()).optional().default([]),
});

export type JobInput = z.infer<typeof jobSchema>;

export const jobStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(JOB_STATUSES),
});

export const jobAssignmentSchema = z.object({
  job_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  role_on_job: z.string().optional().or(z.literal("")),
});

export const jobSubcontractorAssignmentSchema = z.object({
  job_id: z.string().uuid(),
  subcontractor_id: z.string().uuid(),
  role_on_job: z.string().optional().or(z.literal("")),
});
