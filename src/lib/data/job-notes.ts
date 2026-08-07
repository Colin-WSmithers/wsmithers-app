import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface JobNoteRow {
  id: string;
  body: string;
  created_at: string;
  author: { id: string; full_name: string } | null;
}

export async function listJobNotes(jobId: string): Promise<JobNoteRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_notes")
    .select("id, body, created_at, author:profiles(id, full_name)")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as JobNoteRow[];
}
