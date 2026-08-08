import "server-only";
import { createClient } from "@/lib/supabase/server";
import { londonDayRange } from "@/lib/utils";

export interface TodayAppointment {
  id: string;
  title: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  job: {
    id: string;
    job_number: string;
    job_name: string;
    customer: { display_name: string; phone: string | null } | null;
  } | null;
  site: {
    label: string;
    address_line1: string;
    city: string | null;
    postcode: string;
  } | null;
}

/**
 * RLS restricts appointment_assignments/appointments to rows the signed-in
 * tradesperson/subcontractor is actually assigned to, so this query is safe
 * to run as-is for any role.
 */
export async function getMyAppointmentsToday(profileId: string): Promise<TodayAppointment[]> {
  const supabase = await createClient();
  // London-local day, not UTC — see londonDayRange() in lib/utils.
  const { start, end } = londonDayRange();

  const { data } = await supabase
    .from("appointment_assignments")
    .select(
      `appointment:appointments!inner(
        id, title, starts_at, ends_at, status,
        job:jobs(id, job_number, job_name, customer:customers(display_name, phone)),
        site:sites(label, address_line1, city, postcode)
      )`
    )
    .eq("profile_id", profileId)
    .gte("appointment.starts_at", start.toISOString())
    .lt("appointment.starts_at", end.toISOString())
    .order("starts_at", { ascending: true, referencedTable: "appointments" });

  return ((data ?? []) as unknown as { appointment: TodayAppointment }[]).map((r) => r.appointment);
}
