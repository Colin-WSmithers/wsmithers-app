import { z } from "zod";

export const TASK_STATUSES = ["to_do", "in_progress", "blocked", "completed"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const jobTaskSchema = z.object({
  job_id: z.string().uuid(),
  title: z.string().min(1, "Give the task a title"),
  description: z.string().optional().or(z.literal("")),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES),
});

export type JobTaskInput = z.infer<typeof jobTaskSchema>;

export const jobTaskStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  status: z.enum(TASK_STATUSES),
});
