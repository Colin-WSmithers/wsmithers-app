import { z } from "zod";

export const APPOINTMENT_STATUSES = ["scheduled", "confirmed", "in_progress", "completed", "cancelled"] as const;

export const appointmentSchema = z
  .object({
    job_id: z.string().uuid("Choose a job"),
    title: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
    starts_at: z.string().min(1, "Start time is required"),
    ends_at: z.string().min(1, "End time is required"),
    notes: z.string().optional().or(z.literal("")),
    assigned_staff: z.array(z.string().uuid()).optional().default([]),
    assigned_subcontractors: z.array(z.string().uuid()).optional().default([]),
  })
  .refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
    message: "End time must be after the start time",
    path: ["ends_at"],
  });

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const appointmentStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(APPOINTMENT_STATUSES),
});
