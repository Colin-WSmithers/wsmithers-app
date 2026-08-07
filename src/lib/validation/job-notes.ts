import { z } from "zod";

export const jobNoteSchema = z.object({
  job_id: z.string().uuid(),
  body: z.string().min(1, "Write a note before saving"),
});

export type JobNoteInput = z.infer<typeof jobNoteSchema>;
