import Link from "next/link";
import {
  Briefcase, Users2, FileText, Receipt, Inbox, Plus, ClipboardList, Sparkles,
} from "lucide-react";
import { requireProfile, canViewFinancials } from "@/lib/data/auth";
import { getDashboardData, getLatestDailySummary } from "@/lib/data/dashboard";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrencyGBP, formatDateTimeUK, formatDateUK } from "@/lib/utils";

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

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

const QUICK_ACTIONS = [
  { label: "New Enquiry", href: "/enquiries/new", icon: Inbox },
  { label: "New Customer", href: "/customers/new", icon: Users2 },
  { label: "New Quote", href: "/quotes/new", icon: FileText },
  { label: "New Job", href: "/jobs/new", icon: Briefcase },
  { label: "New Invoice", href: "/invoices/new", icon: Receipt },
];

export default async function DashboardPage() {
  const profile = await requireProfile();
  const showFinancials = canViewFinancials(profile.role);
  const [data, latestSummary] = await Promise.all([
    getDashboardData(),
    showFinancials ? getLatestDailySummary() : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Good to see you, {profile.full_name.split(" ")[0]}</h1>
          <p className="text-sm text-slate-500">Here&apos;s what needs doing today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.href} asChild variant="outline" size="sm">
              <Link href={action.href}>
                <Plus className="h-3.5 w-3.5" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Jobs today" value={data.jobsToday} icon={Briefcase} />
        <StatCard label="Jobs this week" value={data.jobsThisWeek} icon={ClipboardList} />
        <StatCard label="Staff working today" value={data.staffWorkingToday} icon={Users2} />
        <StatCard label="Enquiries needing response" value={data.enquiriesNeedingResponse} icon={Inbox} tone={data.enquiriesNeedingResponse > 0 ? "warning" : "default"} />
        {showFinancials && (
          <>
            <StatCard
              label="Outstanding quotes"
              value={`${data.outstandingQuotesCount} · ${formatCurrencyGBP(data.outstandingQuotesValue)}`}
              icon={FileText}
            />
            <StatCard
              label="Overdue invoices"
              value={data.overdueInvoicesCount}
              icon={Receipt}
              tone={data.overdueInvoicesCount > 0 ? "danger" : "default"}
            />
            <StatCard
              label="Unpaid (overdue) total"
              value={formatCurrencyGBP(data.unpaidInvoiceTotal)}
              icon={Receipt}
              tone={data.unpaidInvoiceTotal > 0 ? "danger" : "default"}
            />
          </>
        )}
      </div>

      {showFinancials && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" /> AI end-of-day summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestSummary ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm leading-relaxed text-slate-700">{latestSummary.content}</p>
                <p className="text-xs text-slate-400">
                  For {formatDateUK(latestSummary.summary_date)} · generated {formatDateTimeUK(latestSummary.generated_at)}
                </p>
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No summary yet"
                description="A short AI recap of jobs, hours and money is generated automatically at the end of each working day."
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recently updated jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentlyUpdatedJobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs yet"
              description="Jobs you create or that get updated will show up here so you always know what's moving."
              actionLabel="Create a job"
              actionHref="/jobs/new"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentlyUpdatedJobs.map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/jobs/${job.id}`} className="truncate text-sm font-medium text-slate-900 hover:underline">
                      {job.job_number} — {job.job_name}
                    </Link>
                    <p className="text-xs text-slate-500">Updated {formatDateTimeUK(job.updated_at)}</p>
                  </div>
                  <Badge variant={STATUS_TONE[job.status] ?? "secondary"} className="capitalize shrink-0">
                    {statusLabel(job.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
