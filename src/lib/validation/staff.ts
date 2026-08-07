import { z } from "zod";

export const ROLES = ["admin", "office", "tradesperson", "subcontractor"] as const;

export const staffUpdateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1, "Name is required"),
  role: z.enum(ROLES),
  job_title: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  hourly_rate: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  is_active: z.coerce.boolean().optional(),
});

export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
