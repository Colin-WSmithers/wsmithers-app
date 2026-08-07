import { notFound } from "next/navigation";
import { Briefcase, MapPin, User } from "lucide-react";
import { getJobById } from "@/lib/data/jobs";
import { requireProfile, canViewFinancials } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoon } from "@/components/shared/coming-soon";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const job = await getJobById(id);

  if (!job) notFound();

  const showFinancials = canViewFinancials(profile.role);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">{job.job_number} — {job.job_name}</h1>
            <Badge variant="secondary" className="capitalize">{job.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {job.customer?.display_name ?? "No customer"}
            </span>
            {job.site && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {job.site.address_line1}, {job.site.postcode}
              </span>
            )}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Description" value={job.description ?? "—"} full />
          <Detail label="Start date" value={formatDateUK(job.start_date)} />
          <Detail label="Expected completion" value={formatDateUK(job.expected_completion_date)} />
          {showFinancials && (
            <>
              <Detail label="Estimated value" value={formatCurrencyGBP(job.estimated_value)} />
              <Detail label="Estimated cost" value={formatCurrencyGBP(job.estimated_cost)} />
            </>
          )}
        </CardContent>
      </Card>

      <ComingSoon
        icon={Briefcase}
        title="Tasks, timesheets, photos, materials & documents"
        description="The full job workspace — tasks, timesheets, costs, photos, documents, notes and activity tabs — is built in Phases 3–5."
        phase="Phase 3–5"
      />
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}
