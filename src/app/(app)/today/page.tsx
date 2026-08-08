import Link from "next/link";
import { MapPin, Phone, Play, Camera, Calendar, Briefcase, ArrowRight } from "lucide-react";
import { requireProfile } from "@/lib/data/auth";
import { getMyAppointmentsToday } from "@/lib/data/today";
import { listJobs } from "@/lib/data/jobs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { getLatestDailySummary } from "@/lib/data/dashboard";

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
  const [appointments, myJobs, opsSummary] = await Promise.all([
    getMyAppointmentsToday(profile.id),
    listJobs(), // RLS already limits this to jobs the signed-in tradesperson/subcontractor is assigned to
    getLatestDailySummary("operations"),
  ]);
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Today" title={today} />

      {appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nothing scheduled today"
          description="When the office schedules you on a job, it'll appear here — check back or contact the office if you think this is wrong."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map((appt) => {
            const phone = appt.job?.customer?.phone ?? null;
            const mapQuery = appt.site
              ? encodeURIComponent(`${appt.site.address_line1}, ${appt.site.postcode}`)
              : null;
            return (
              <Card key={appt.id} className="overflow-hidden">
                {/* Brand rail makes each appointment card scannable at a glance on site */}
                <div className="flex">
                  <div className="w-1 shrink-0 bg-brand-600" />
                  <CardContent className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="tnum font-display text-lg font-semibold tracking-tight text-ink-900">
                        {formatTime(appt.starts_at)} – {formatTime(appt.ends_at)}
                      </p>
                      {appt.title ? <span className="text-sm text-ink-500">{appt.title}</span> : null}
                    </div>

                    {appt.job && (
                      <p className="text-sm text-ink-700">
                        <span className="tnum font-medium text-brand-700">{appt.job.job_number}</span>
                        <span className="mx-1.5 text-ink-300">·</span>
                        {appt.job.job_name}
                        {appt.job.customer ? (
                          <span className="block text-xs text-ink-400">{appt.job.customer.display_name}</span>
                        ) : null}
                      </p>
                    )}

                    {appt.site && (
                      <p className="flex items-start gap-1.5 text-sm text-ink-500">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                        {appt.site.address_line1}, {appt.site.city ? `${appt.site.city}, ` : ""}
                        {appt.site.postcode}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                      <Button asChild size="sm" variant="primary">
                        <Link href="/timesheets">
                          <Play className="h-3.5 w-3.5" /> Clock in
                        </Link>
                      </Button>
                      {appt.job && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/jobs/${appt.job.id}`}>View job</Link>
                        </Button>
                      )}
                      {mapQuery && (
                        <Button asChild size="sm" variant="outline">
                          <a href={`https://maps.google.com/?q=${mapQuery}`} target="_blank" rel="noreferrer">
                            <MapPin className="h-3.5 w-3.5" /> Directions
                          </a>
                        </Button>
                      )}
                      {phone && (
                        <Button asChild size="sm" variant="outline">
                          <a href={`tel:${phone.replace(/\s+/g, "")}`}>
                            <Phone className="h-3.5 w-3.5" /> Call
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <p className="eyebrow">Your jobs</p>
        {myJobs.length === 0 ? (
          <p className="text-sm text-ink-500">You&apos;re not assigned to any jobs yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group flex items-center justify-between gap-3 rounded-card border border-ink-200/80 bg-white px-4 py-3 shadow-subtle transition-all hover:border-brand-200 hover:shadow-raised"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-ink-400 transition-colors group-hover:text-brand-600" />
                    <span className="truncate">
                      <span className="tnum text-brand-700">{job.job_number}</span>
                      <span className="mx-1.5 text-ink-300">·</span>
                      {job.job_name}
                    </span>
                  </p>
                  <p className="mt-0.5 pl-[1.375rem] text-xs text-ink-400">{job.customer?.display_name ?? "—"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={STATUS_TONE[job.status] ?? "secondary"} className="capitalize">
                    {job.status.replace(/_/g, " ")}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* The crew get the same job rundown the office sees — it's written from
          the notes they log, so it's worth them reading it back. */}
      {opsSummary ? (
        <SummaryCard
          title="Today across all jobs"
          summary={opsSummary}
          canGenerate={false}
          emptyDescription=""
        />
      ) : null}

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-ink-400">
        <Camera className="h-3.5 w-3.5" /> Open a job above to log tasks, notes, photos and documents.
      </p>
    </div>
  );
}
