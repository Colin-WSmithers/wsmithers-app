import { Clock } from "lucide-react";
import { getOpenTimesheet, listMyTimesheets, listAllTimesheets } from "@/lib/data/timesheets";
import { listJobs } from "@/lib/data/jobs";
import { requireProfile, isOfficeOrAdmin, canViewFinancials } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDateTimeUK, formatDurationMinutes } from "@/lib/utils";
import { ShiftTimerCard } from "./shift-timer-card";
import { ManualEntryDialog } from "./manual-entry-dialog";
import { ApproveButton } from "./approve-button";

export default async function TimesheetsPage() {
  const profile = await requireProfile();
  const office = isOfficeOrAdmin(profile.role);

  const [myJobs, openShift, myTimesheets, allTimesheets] = await Promise.all([
    listJobs(),
    getOpenTimesheet(profile.id),
    listMyTimesheets(profile.id),
    office ? listAllTimesheets() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Timesheets</h1>
        <p className="text-sm text-slate-500">
          {office ? "Review and approve hours logged across every job." : "Clock in/out on jobs and review your logged hours."}
        </p>
      </div>

      <ShiftTimerCard
        openShift={openShift}
        jobs={myJobs.map((j) => ({ id: j.id, job_number: j.job_number, job_name: j.job_name }))}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Your hours</CardTitle>
          <ManualEntryDialog jobs={myJobs.map((j) => ({ id: j.id, job_number: j.job_number, job_name: j.job_name }))} />
        </CardHeader>
        <CardContent>
          {myTimesheets.length === 0 ? (
            <EmptyState icon={Clock} title="No hours logged yet" description="Clock in on a job or add a manual entry to get started." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTimesheets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.job ? `${t.job.job_number} — ${t.job.job_name}` : "—"}</TableCell>
                      <TableCell>{formatDateTimeUK(t.started_at)}</TableCell>
                      <TableCell>{formatDurationMinutes(t.duration_minutes)}</TableCell>
                      <TableCell>
                        {!t.ended_at ? (
                          <Badge variant="info">In progress</Badge>
                        ) : t.is_approved ? (
                          <Badge variant="success">Approved</Badge>
                        ) : (
                          <Badge variant="secondary">Pending approval</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {office && (
        <Card>
          <CardHeader>
            <CardTitle>All timesheets</CardTitle>
          </CardHeader>
          <CardContent>
            {allTimesheets.length === 0 ? (
              <EmptyState icon={Clock} title="No hours logged yet" description="Once the crew starts clocking in, entries will appear here for approval." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTimesheets.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.profile?.full_name ?? "—"}</TableCell>
                        <TableCell>{t.job ? `${t.job.job_number} — ${t.job.job_name}` : "—"}</TableCell>
                        <TableCell>{formatDateTimeUK(t.started_at)}</TableCell>
                        <TableCell>{formatDurationMinutes(t.duration_minutes)}</TableCell>
                        <TableCell>
                          {!t.ended_at ? (
                            <Badge variant="info">In progress</Badge>
                          ) : t.is_approved ? (
                            <Badge variant="success">Approved</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {t.ended_at && !t.is_approved && canViewFinancials(profile.role) && (
                            <ApproveButton timesheetId={t.id} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
