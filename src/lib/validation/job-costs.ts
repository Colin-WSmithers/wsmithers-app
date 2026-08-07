import { z } from "zod";

export const JOB_COST_CATEGORIES = ["material", "labour", "subcontractor", "other"] as const;

export const jobCostSchema = z.object({
  job_id: z.string().uuid(),
  category: z.enum(JOB_COST_CATEGORIES),
  item: z.string().min(1, "Describe what this cost was for"),
  quantity: z.coerce.number().min(0.01, "Enter a quantity"),
  unit_cost: z.coerce.number().min(0, "Enter a unit cost"),
  vat_rate: z.coerce.number().min(0).max(100).default(20),
  incurred_date: z.string().optional().or(z.literal("")),
});

export type JobCostInput = z.infer<typeof jobCostSchema>;
