import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PhotoCategory } from "@/lib/supabase/types";

export interface JobPhotoRow {
  id: string;
  storage_path: string;
  category: PhotoCategory;
  description: string | null;
  created_at: string;
  uploaded_by: { id: string; full_name: string } | null;
  signed_url: string | null;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — long enough to view a page, short enough to be safe

export async function listJobPhotos(jobId: string): Promise<JobPhotoRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_photos")
    .select("id, storage_path, category, description, created_at, uploaded_by:profiles(id, full_name)")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Omit<JobPhotoRow, "signed_url">[];
  if (rows.length === 0) return [];

  const { data: signedUrls } = await supabase.storage
    .from("job-photos")
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      SIGNED_URL_TTL_SECONDS
    );

  return rows.map((row, i) => ({
    ...row,
    signed_url: signedUrls?.[i]?.signedUrl ?? null,
  }));
}
