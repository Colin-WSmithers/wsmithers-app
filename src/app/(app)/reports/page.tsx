import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp, TrendingDown, Receipt, FileText, AlertTriangle, ShoppingCart, Clock,
} from "lucide-react";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { getReportsData } from "@/lib/data/reports";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyGBP, formatDateUK, formatDurationMinutes } from "@/lib/utils";

export default async function ReportsPage() {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    redirect("/dashboard");
  }

  const data = await getReportsData();
  const conversionRate = data.quotesSentLast90 > 0
    ? Math.round((data.quotesAcceptedLast90 / data.quotesSentLast90) * 100)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title text-[1.375rem] leading-tight">Reports</h1>
        <p className="text-sm text-ink-500">Business performance, job profitability and staff utilisation.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Invoiced this month" value={formatCurrencyGBP(data.revenueThisMonth)} icon={Receipt} />
        <StatCard label="Received this month" value={formatCurrencyGBP(data.paidThisMonth)} icon={TrendingUp} />
        <StatCard label="Outstanding balance" value={formatCurrencyGBP(data.outstandingBalance)} icon={FileText} />
        <StatCard
          label="Overdue invoices"
          value={`${data.overdueInvoicesCount} · ${formatCurrencyGBP(data.overdueInvoicesValue)}`}
          icon={AlertTriangle}
          tone={data.overdueInvoicesCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Outstanding quotes"
          value={`${data.outstandingQuotesCount} · ${formatCurrencyGBP(data.outstandingQuotesValue)}`}
          icon={FileText}
        />
        <StatCard
          label="Quote conversion (90d)"
          value={conversionRate === null ? "—" : `${conversionRate}%`}
          icon={TrendingUp}
        />
        <StatCard label="Open purchase orders" value={formatCurrencyGBP(data.openPurchaseOrdersValue)} icon={ShoppingCart} />
        <StatCard label="Staff hours this week" value={formatDurationMinutes(data.staffHoursThisWeek.reduce((s, r) => s + r.minutes, 0))} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overdue invoices</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {data.overdueInvoices.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState icon={AlertTriangle} title="Nothing overdue" description="All invoices are within their payment terms." />
              </div>
            ) : (
              <div className="flex flex-col">
                {data.overdueInvoices.map((row) => (
                  <Link
                    key={row.id}
                    href={`/invoices/${row.id}`}
                    className="flex items-center justify-between gap-3 border-t border-ink-100 px-6 py-2.5 text-sm hover:bg-ink-50 first:border-t-0"
                  >
                    <span>
                      <span className="font-medium text-ink-900">{row.invoice_number}</span>
                      <span className="ml-2 text-ink-500">{row.customer_name}</span>
                    </span>
                    <span className="flex items-center gap-3 text-right">
                      <span className="text-xs text-ink-400">Due {formatDateUK(row.due_date)}</span>
                      <span className="font-medium text-red-600">{formatCurrencyGBP(row.outstanding)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff hours this week</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {data.staffHoursThisWeek.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState icon={Clock} title="No hours logged" description="No timesheet entries have been recorded this week yet." />
              </div>
            ) : (
              <div className="flex flex-col">
                {data.staffHoursThisWeek.map((row) => (
                  <div
                    key={row.profile_id}
                    className="flex items-center justify-between gap-3 border-t border-ink-100 px-6 py-2.5 text-sm first:border-t-0"
                  >
                    <span className="font-medium text-ink-900">{row.full_name}</span>
                    <span className="text-ink-600">{formatDurationMinutes(row.minutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job profitability — lowest margin first</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {data.jobProfitability.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState icon={TrendingDown} title="No active jobs" description="Job costs and estimated values will appear here once jobs are underway." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-6 py-2 font-medium">Job</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Estimated value</th>
                    <th className="px-3 py-2 text-right font-medium">Actual cost</th>
                    <th className="px-6 py-2 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobProfitability.map((row) => (
                    <tr key={row.id} className="border-t border-ink-100 hover:bg-ink-50">
                      <td className="px-6 py-2.5">
                        <Link href={`/jobs/${row.id}`} className="font-medium text-ink-900 hover:underline">
                          {row.job_number}
                        </Link>
                        <span className="ml-2 text-ink-500">{row.job_name}</span>
                      </td>
                      <td className="px-3 py-2.5 capitalize text-ink-600">{row.status.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2.5 text-right text-ink-600">{formatCurrencyGBP(row.estimated_value)}</td>
                      <td className="px-3 py-2.5 text-right text-ink-600">{formatCurrencyGBP(row.actual_cost)}</td>
                      <td className={`px-6 py-2.5 text-right font-medium ${row.margin < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatCurrencyGBP(row.margin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
