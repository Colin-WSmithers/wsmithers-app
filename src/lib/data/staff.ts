import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

/** Active staff for assignment pickers (enquiries, jobs, tasks, scheduling). */
export async function listAssignableStaff(): Promise<{ id: string; full_name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  return data ?? [];
}

/** Every staff profile (including inactive), for the admin Staff management page. */
export async function listAllStaff(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
  return (data ?? []) as Profile[];
}
