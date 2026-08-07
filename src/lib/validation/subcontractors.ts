import { z } from "zod";

export const subcontractorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company_name: z.string().optional().or(z.literal("")),
  trade: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  day_rate: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  hourly_rate: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  notes: z.string().optional().or(z.literal("")),
});

export type SubcontractorInput = z.infer<typeof subcontractorSchema>;
