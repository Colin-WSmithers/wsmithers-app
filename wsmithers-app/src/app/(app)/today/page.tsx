import Link from "next/link";
import { MapPin, Phone, Play, Camera, Calendar } from "lucide-react";
import { requireProfile } from "@/lib/data/auth";
import { getMyAppointmentsToday } from "@/lib/data/today";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default async function TodayPage() {
  const profile = await requireProfile();
  const appointments = await getMyAppointmentsToday(profile.id);
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
                  <Button size="sm" variant="primary" disabled title="Live timers arrive in Phase 5">
                    <Play className="h-3.5 w-3.5" /> Start Timer
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

      <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-slate-400">
        <Camera className="h-3.5 w-3.5" /> Photo, note & material logging opens from inside a job (Phase 3–5).
      </p>
    </div>
  );
}
