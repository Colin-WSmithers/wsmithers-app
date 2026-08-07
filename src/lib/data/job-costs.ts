import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JobCostCategory } from "@/lib/supabase/types";

export interface JobCostRow {
  id: string;
  category: JobCostCategory;
  item: string;
  quantity: number;
  unit_cost: number;
  vat_rate: number;
  total: number;
  incurred_date: string;
  added_by: { id: string; full_name: string } | null;
}

/**
 * Office/admin only — RLS gives tradespeople insert access to log a cost but
 * no select access at all, so this naturally returns nothing for them
 * (financial data stays hidden at the database level, not just the UI).
 */
export async function listJobCosts(jobId: string): Promise<JobCostRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_costs")
    .select("id, category, item, quantity, unit_cost, vat_rate, total, incurred_date, added_by:profiles(id, full_name)")
    .eq("job_id", jobId)
    .order("incurred_date", { ascending: false });

  return (data ?? []) as unknown as JobCostRow[];
}
