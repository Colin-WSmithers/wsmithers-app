import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, MapPin } from "lucide-react";
import { listAppointmentsInRange } from "@/lib/data/schedule";
import { listJobs } from "@/lib/data/jobs";
import { listAssignableStaff } from "@/lib/data/staff";
import { listActiveSubcontractorsForPicker } from "@/lib/data/subcontractors";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { AppointmentFormDialog } from "./appointment-form-dialog";
import { AppointmentStatusSelect } from "./appointment-status-select";
import { DeleteAppointmentButton } from "./delete-appointment-button";

const STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  scheduled: "info",
  confirmed: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "destructive",
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday as start of week
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const profile = await requireProfile();
  const office = isOfficeOrAdmin(profile.role);
  const { week } = await searchParams;

  const anchor = week && !Number.isNaN(Date.parse(week)) ? new Date(week) : new Date();
  const weekStart = startOfWeek(anchor);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const prevWeek = new Date(weekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [appointments, jobs, staff, subcontractors] = await Promise.all([
    listAppointmentsInRange(weekStart.toISOString(), weekEnd.toISOString()),
    office ? listJobs() : Promise.resolve([]),
    office ? listAssignableStaff() : Promise.resolve([]),
    office ? listActiveSubcontractorsForPicker() : Promise.resolve([]),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const byDay = new Map<string, typeof appointments>();
  for (const day of days) byDay.set(toDateKey(day), []);
  for (const appt of appointments) {
    const key = toDateKey(new Date(appt.starts_at));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(appt);
  }

  const weekLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(weekStart) +
    " – " +
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(weekEnd.getTime() - 1)
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Schedule</h1>
          <p className="text-sm text-slate-500">{office ? "Every appointment across the crew." : "Your appointments this week."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/schedule?week=${toDateKey(prevWeek)}`}><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="text-sm font-medium text-slate-700">{weekLabel}</span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/schedule?week=${toDateKey(nextWeek)}`}><ChevronRight className="h-4 w-4" /></Link>
          </Button>
          {office && (
            <AppointmentFormDialog jobs={jobs} staff={staff} subcontractors={subcontractors} defaultDate={toDateKey(new Date())} />
          )}
        </div>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled this week"
          description={office ? "Schedule an appointment to get the crew booked in." : "Check back once the office schedules you on a job."}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayAppointments = byDay.get(key) ?? [];
          const isToday = key === toDateKey(new Date());
          return (
            <div key={key} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-blue-600" : "text-slate-400"}`}>
                {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(day)}
              </p>
              {dayAppointments.length === 0 ? (
                <p className="text-xs text-slate-300">—</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dayAppointments.map((appt) => (
                    <div key={appt.id} className="rounded-md border border-slate-100 bg-slate-50 p-2.5">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-900">
                          {formatTime(appt.starts_at)}–{formatTime(appt.ends_at)}
                        </p>
                        {office && <DeleteAppointmentButton appointmentId={appt.id} />}
                      </div>
                      {appt.job && (
                        <Link href={`/jobs/${appt.job.id}`} className="text-xs font-medium text-slate-800 hover:underline">
                          {appt.job.job_number} — {appt.job.job_name}
                        </Link>
                      )}
                      {appt.title && <p className="text-xs text-slate-600">{appt.title}</p>}
                      {appt.site && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin className="h-3 w-3" /> {appt.site.address_line1}
                        </p>
                      )}
                      {appt.assignments.length > 0 && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {appt.assignments.map((a) => a.profile?.full_name ?? a.subcontractor?.name).filter(Boolean).join(", ")}
                        </p>
                      )}
                      <div className="mt-2">
                        {office ? (
                          <AppointmentStatusSelect appointmentId={appt.id} currentStatus={appt.status} />
                        ) : (
                          <Badge variant={STATUS_TONE[appt.status] ?? "secondary"} className="w-fit capitalize">
                            {appt.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
