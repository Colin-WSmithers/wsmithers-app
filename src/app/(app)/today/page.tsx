import Link from "next/link";
import { MapPin, Phone, Play, Camera, Calendar, Briefcase } from "lucide-react";
import { requireProfile } from "@/lib/data/auth";
import { getMyAppointmentsToday } from "@/lib/data/today";
import { listJobs } from "@/lib/data/jobs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

const STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  draft: "secondary", scheduled: "info", in_progress: "warning", on_hold: "destructive",
  awaiting_materials: "warning", awaiting_customer: "warning", completed: "success",
  invoiced: "success", cancelled: "destructive",
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default async function TodayPage() {
  const profile = await requireProfile();
  const [appointments, myJobs] = await Promise.all([
    getMyAppointmentsToday(profile.id),
    listJobs(), // RLS already limits this to jobs the signed-in tradesperson/subcontractor is assigned to
  ]);
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today</p>
        <h1 className="text-lg font-semibold text-slate-900">{today}</h1>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nothing scheduled today"
          description="When the office schedules you on a job, it'll appear here — check back or contact the office if you think this is wrong."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex flex-col gap-3 pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{formatTime(appt.starts_at)} – {formatTime(appt.ends_at)}</p>
                    {appt.job && (
                      <p className="text-sm text-slate-600">
                        {appt.job.job_number} — {appt.job.job_name}
                      </p>
                    )}
                  </div>
                </div>
                {appt.site && (
                  <p className="flex items-start gap-1.5 text-sm text-slate-500">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    {appt.site.address_line1}, {appt.site.city ? `${appt.site.city}, ` : ""}{appt.site.postcode}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                  <Button asChild size="sm" variant="outline">
                    <Link href={appt.job ? `/jobs/${appt.job.id}` : "#"}>View Job</Link>
                  </Button>
                  <Button asChild size="sm" variant="primary">
                    <Link href="/timesheets"><Play className="h-3.5 w-3.5" /> Clock in</Link>
                  </Button>
                  {appt.site && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(
                          `${appt.site.address_line1}, ${appt.site.postcode}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MapPin className="h-3.5 w-3.5" /> Open Map
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled title="Calling from the app arrives in a later phase">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your jobs</p>
        {myJobs.length === 0 ? (
          <p className="text-sm text-slate-500">You&apos;re not assigned to any jobs yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" /> {job.job_number} — {job.job_name}
                  </p>
                  <p className="text-xs text-slate-500">{job.customer?.display_name ?? "—"}</p>
                </div>
                <Badge variant={STATUS_TONE[job.status] ?? "secondary"} className="capitalize">
                  {job.status.replace(/_/g, " ")}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-slate-400">
        <Camera className="h-3.5 w-3.5" /> Open a job above to log tasks, notes, photos and documents.
      </p>
    </div>
  );
}
