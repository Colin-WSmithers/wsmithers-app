import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/supabase/types";

export interface AppointmentRow {
  id: string;
  title: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  job: { id: string; job_number: string; job_name: string } | null;
  site: { label: string; address_line1: string; postcode: string } | null;
  assignments: {
    id: string;
    profile: { id: string; full_name: string } | null;
    subcontractor: { id: string; name: string } | null;
  }[];
}

/**
 * RLS restricts this the same way as everything else: office/admin see every
 * appointment, tradespeople/subcontractors only see appointments they're
 * personally assigned to (appointments_assigned_select policy).
 */
export async function listAppointmentsInRange(startISO: string, endISO: string): Promise<AppointmentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      `id, title, description, starts_at, ends_at, status, notes,
       job:jobs(id, job_number, job_name),
       site:sites(label, address_line1, postcode),
       assignments:appointment_assignments(id, profile:profiles(id, full_name), subcontractor:subcontractors(id, name))`
    )
    .gte("starts_at", startISO)
    .lt("starts_at", endISO)
    .order("starts_at", { ascending: true });

  return (data ?? []) as unknown as AppointmentRow[];
}

/**
 * For double-booking prevention when scheduling: any appointment slot a
 * given set of staff are already booked into that overlaps a proposed
 * start/end time. Office/admin can see all appointments so this is accurate
 * when called by an office/admin user (the only role that creates appointments).
 */
export async function findOverlappingAssignments(
  profileIds: string[],
  startISO: string,
  endISO: string,
  excludeAppointmentId?: string
): Promise<{ profileId: string; fullName: string; appointmentTitle: string | null; jobNumber: string }[]> {
  if (profileIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointment_assignments")
    .select(
      `profile_id, profile:profiles(id, full_name),
       appointment:appointments(id, title, starts_at, ends_at, status, job:jobs(job_number))`
    )
    .in("profile_id", profileIds);

  const rows = (data ?? []) as unknown as Array<{
    profile_id: string;
    profile: { id: string; full_name: string } | null;
    appointment: {
      id: string;
      title: string | null;
      starts_at: string;
      ends_at: string;
      status: string;
      job: { job_number: string } | null;
    } | null;
  }>;

  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();

  return rows
    .filter((row) => {
      const appt = row.appointment;
      if (!appt || appt.status === "cancelled") return false;
      if (excludeAppointmentId && appt.id === excludeAppointmentId) return false;
      const apptStart = new Date(appt.starts_at).getTime();
      const apptEnd = new Date(appt.ends_at).getTime();
      return apptStart < end && apptEnd > start;
    })
    .map((row) => ({
      profileId: row.profile_id,
      fullName: row.profile?.full_name ?? "Someone",
      appointmentTitle: row.appointment?.title ?? null,
      jobNumber: row.appointment?.job?.job_number ?? "another job",
    }));
}
