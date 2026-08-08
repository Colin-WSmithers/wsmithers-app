import Link from "next/link";
import {
  Briefcase, Users2, FileText, Receipt, Inbox, Plus, ClipboardList, ArrowRight,
} from "lucide-react";
import { requireProfile, canViewFinancials } from "@/lib/data/auth";
import { getDashboardData, getLatestDailySummary } from "@/lib/data/dashboard";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrencyGBP, formatDateTimeUK } from "@/lib/utils";

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
  { label: "Enquiry", href: "/enquiries/new", icon: Inbox },
  { label: "Customer", href: "/customers/new", icon: Users2 },
  { label: "Quote", href: "/quotes/new", icon: FileText },
  { label: "Job", href: "/jobs/new", icon: Briefcase },
  { label: "Invoice", href: "/invoices/new", icon: Receipt },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const showFinancials = canViewFinancials(profile.role);
  const [data, opsSummary, financialSummary] = await Promise.all([
    getDashboardData(),
    getLatestDailySummary("operations"),
    showFinancials ? getLatestDailySummary("financial") : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting()}, ${profile.full_name.split(" ")[0]}`}
        description="Here's what needs doing today."
        actions={QUICK_ACTIONS.map((action, i) => (
          <Button key={action.href} asChild variant={i === 0 ? "primary" : "outline"} size="sm">
            <Link href={action.href}>
              <Plus className="h-3.5 w-3.5" />
              {action.label}
            </Link>
          </Button>
        ))}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Jobs today" value={data.jobsToday} icon={Briefcase} tone="brand" />
        <StatCard label="Jobs this week" value={data.jobsThisWeek} icon={ClipboardList} />
        <StatCard label="Staff working today" value={data.staffWorkingToday} icon={Users2} />
        <StatCard
          label="Enquiries to answer"
          value={data.enquiriesNeedingResponse}
          icon={Inbox}
          tone={data.enquiriesNeedingResponse > 0 ? "warning" : "default"}
        />
        {showFinancials && (
          <>
            <StatCard
              label="Outstanding quotes"
              value={formatCurrencyGBP(data.outstandingQuotesValue)}
              hint={`${data.outstandingQuotesCount} awaiting a decision`}
              icon={FileText}
            />
            <StatCard
              label="Overdue invoices"
              value={data.overdueInvoicesCount}
              icon={Receipt}
              tone={data.overdueInvoicesCount > 0 ? "danger" : "default"}
            />
            <StatCard
              label="Overdue balance"
              value={formatCurrencyGBP(data.unpaidInvoiceTotal)}
              icon={Receipt}
              tone={data.unpaidInvoiceTotal > 0 ? "danger" : "default"}
            />
          </>
        )}
      </div>

      {/* The job rundown is the one everybody reads, so it leads. */}
      <SummaryCard
        title="Today on the jobs"
        summary={opsSummary}
        canGenerate={showFinancials}
        emptyDescription="At the end of each day this writes up what happened on every job, from the notes the crew log on site and the hours they book."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {showFinancials && (
          <SummaryCard
            className="xl:col-span-2"
            title="Money today"
            summary={financialSummary}
            canGenerate={false}
            emptyDescription="Quotes, invoices, payments and anything overdue — written at the end of each working day. Office and admin only."
          />
        )}

        <Card className={showFinancials ? "xl:col-span-3" : "xl:col-span-5"}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recently updated jobs</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/jobs">
                All jobs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
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
              <ul className="-mx-2 divide-y divide-ink-100">
                {data.recentlyUpdatedJobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-brand-50/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink-900">
                          <span className="tnum text-brand-700">{job.job_number}</span>
                          <span className="mx-1.5 text-ink-300">·</span>
                          {job.job_name}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-400">
                          Updated {formatDateTimeUK(job.updated_at)}
                        </span>
                      </span>
                      <Badge variant={STATUS_TONE[job.status] ?? "secondary"} className="shrink-0 capitalize">
                        {statusLabel(job.status)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
