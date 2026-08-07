import { z } from "zod";

export const startShiftSchema = z.object({
  job_id: z.string().uuid("Choose a job"),
});

export const endShiftSchema = z.object({
  id: z.string().uuid(),
  break_minutes: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? 0 : v)),
});

export const manualTimesheetSchema = z
  .object({
    job_id: z.string().uuid("Choose a job"),
    started_at: z.string().min(1, "Start time is required"),
    ended_at: z.string().min(1, "End time is required"),
    break_minutes: z
      .union([z.coerce.number().min(0), z.literal("")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? 0 : v)),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.ended_at) > new Date(data.started_at), {
    message: "End time must be after the start time",
    path: ["ended_at"],
  });

export type ManualTimesheetInput = z.infer<typeof manualTimesheetSchema>;

export const approveTimesheetSchema = z.object({
  id: z.string().uuid(),
});
