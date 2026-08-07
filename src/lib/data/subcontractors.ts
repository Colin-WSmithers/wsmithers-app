import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Subcontractor } from "@/lib/supabase/types";

export async function listSubcontractors(): Promise<Subcontractor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subcontractors")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return (data ?? []) as Subcontractor[];
}

export async function listActiveSubcontractorsForPicker(): Promise<{ id: string; name: string; trade: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subcontractors")
    .select("id, name, trade")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return data ?? [];
}
