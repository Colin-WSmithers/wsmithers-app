import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";

export async function listSuppliers(): Promise<Supplier[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return (data ?? []) as Supplier[];
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("*").eq("id", id).is("deleted_at", null).single();
  return (data as Supplier) ?? null;
}

export async function listSuppliersForPicker(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return data ?? [];
}
