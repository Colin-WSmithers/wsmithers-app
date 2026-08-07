import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JobTaskStatus, TaskPriority } from "@/lib/supabase/types";

export interface JobTaskRow {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: JobTaskStatus;
  assigned_to: { id: string; full_name: string } | null;
}

/**
 * RLS restricts this the same way as jobs: office/admin see every task on
 * every job, tradespeople/subcontractors only see tasks on jobs they're
 * assigned to (job_tasks_assigned_all policy).
 */
export async function listJobTasks(jobId: string): Promise<JobTaskRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_tasks")
    .select("id, job_id, title, description, due_date, priority, status, assigned_to:profiles(id, full_name)")
    .eq("job_id", jobId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []) as unknown as JobTaskRow[];
}
