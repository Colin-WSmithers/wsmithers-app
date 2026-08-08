import Link from "next/link";
import { Briefcase, Plus, MapPin } from "lucide-react";
import { listJobs } from "@/lib/data/jobs";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDateUK } from "@/lib/utils";

const STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  draft: "secondary",
  scheduled: "info",
  in_progress: "warning",
  on_hold: "destructive",
  awaiting_materials: "warning",
  awaiting_customer: "warning",
  completed: "success",
  invoiced: "success",
  cancelled: "destructive",
};

export default async function JobsPage() {
  const profile = await requireProfile();
  const jobs = await listJobs();
  const office = isOfficeOrAdmin(profile.role);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title text-[1.375rem] leading-tight">Jobs</h1>
          <p className="text-sm text-ink-500">
            {office ? "Every job currently in the system." : "Jobs you're assigned to."}
          </p>
        </div>
        {office && (
          <Button asChild size="sm">
            <Link href="/jobs/new">
              <Plus className="h-4 w-4" /> New Job
            </Link>
          </Button>
        )}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={office ? "No jobs yet" : "No jobs assigned to you yet"}
          description={
            office
              ? "Jobs are usually created by converting an accepted quote, or you can start one from scratch."
              : "Once the office assigns you to a job, it'll show up here and on your Today screen."
          }
          actionLabel={office ? "Create a job" : undefined}
          actionHref={office ? "/jobs/new" : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Link href={`/jobs/${job.id}`} className="font-medium text-ink-900 hover:underline">
                      {job.job_number}
                    </Link>
                    <p className="text-xs text-ink-500">{job.job_name}</p>
                  </TableCell>
                  <TableCell>{job.customer?.display_name ?? "—"}</TableCell>
                  <TableCell>
                    {job.site ? (
                      <span className="inline-flex items-center gap-1 text-ink-600">
                        <MapPin className="h-3.5 w-3.5 text-ink-400" /> {job.site.label} · {job.site.postcode}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[job.status] ?? "secondary"} className="capitalize">
                      {job.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateUK(job.start_date)}</TableCell>
                  <TableCell>{formatDateUK(job.expected_completion_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
