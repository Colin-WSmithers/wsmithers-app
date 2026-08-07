import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DocumentCategory } from "@/lib/supabase/types";

export interface DocumentRow {
  id: string;
  filename: string;
  storage_path: string;
  category: DocumentCategory;
  description: string | null;
  created_at: string;
  uploaded_by: { id: string; full_name: string } | null;
  job: { id: string; job_number: string; job_name: string } | null;
  customer: { id: string; display_name: string } | null;
  signed_url: string | null;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function withSignedUrls(
  rows: Omit<DocumentRow, "signed_url">[]
): Promise<DocumentRow[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const { data: signedUrls } = await supabase.storage
    .from("documents")
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      SIGNED_URL_TTL_SECONDS
    );

  return rows.map((row, i) => ({
    ...row,
    signed_url: signedUrls?.[i]?.signedUrl ?? null,
  }));
}

export async function listJobDocuments(jobId: string): Promise<DocumentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select(
      "id, filename, storage_path, category, description, created_at, uploaded_by:profiles(id, full_name), job:jobs(id, job_number, job_name), customer:customers(id, display_name)"
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  return withSignedUrls((data ?? []) as unknown as Omit<DocumentRow, "signed_url">[]);
}

/**
 * All documents across every job/customer — for the top-level Documents
 * section. RLS still applies (tradespeople only see documents on jobs
 * they're assigned to), so this is safe to expose to every role.
 */
export async function listAllDocuments(search?: string): Promise<DocumentRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("documents")
    .select(
      "id, filename, storage_path, category, description, created_at, uploaded_by:profiles(id, full_name), job:jobs(id, job_number, job_name), customer:customers(id, display_name)"
    )
    .order("created_at", { ascending: false });

  if (search && search.trim()) {
    query = query.ilike("filename", `%${search}%`);
  }

  const { data } = await query;
  return withSignedUrls((data ?? []) as unknown as Omit<DocumentRow, "signed_url">[]);
}
