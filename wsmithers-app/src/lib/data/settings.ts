import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CompanySettings } from "@/lib/supabase/types";

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_settings").select("*").limit(1).single();
  return data as CompanySettings | null;
}
