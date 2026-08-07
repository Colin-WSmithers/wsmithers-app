import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, MapPin, Star, Briefcase, Plus, FileText, Receipt } from "lucide-react";
import { getCustomerById } from "@/lib/data/customers";
import { listJobsForCustomer } from "@/lib/data/jobs";
import { listQuotesForCustomer } from "@/lib/data/quotes";
import { listInvoicesForCustomer } from "@/lib/data/invoices";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";
import { AddSiteDialog } from "./add-site-dialog";
import { AddContactDialog } from "./add-contact-dialog";

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

const QUOTE_STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  draft: "secondary", sent: "info", viewed: "info", accepted: "success", rejected: "destructive", expired: "destructive",
};

const INVOICE_STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  draft: "secondary", sent: "info", viewed: "info", part_paid: "warning", paid: "success", overdue: "destructive", void: "destructive",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const office = isOfficeOrAdmin(profile.role);
  const [customer, jobs, quotes, invoices] = await Promise.all([
    getCustomerById(id),
    listJobsForCustomer(id),
    office ? listQuotesForCustomer(id) : Promise.resolve([]),
    office ? listInvoicesForCustomer(id) : Promise.resolve([]),
  ]);

  if (!customer) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-semibold text-slate-900">{customer.display_name}</h1>
        {customer.company_name && <p className="text-sm text-slate-500">{customer.company_name}</p>}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          {customer.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" /> {customer.email}
            </span>
          )}
          {customer.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" /> {customer.phone}
            </span>
          )}
          {(customer.billing_city || customer.billing_postcode) && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {[customer.billing_address_line1, customer.billing_city, customer.billing_postcode]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Sites</CardTitle>
            <AddSiteDialog customerId={customer.id} />
          </CardHeader>
          <CardContent>
            {customer.sites.length === 0 ? (
              <EmptyState icon={MapPin} title="No sites yet" description="Add the properties or addresses work happens at for this customer." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {customer.sites.map((site) => (
                  <li key={site.id} className="py-2.5">
                    <p className="text-sm font-medium text-slate-900">{site.label}</p>
                    <p className="text-xs text-slate-500">
                      {[site.address_line1, site.city, site.postcode].filter(Boolean).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Contacts</CardTitle>
            <AddContactDialog customerId={customer.id} />
          </CardHeader>
          <CardContent>
            {customer.contacts.length === 0 ? (
              <EmptyState icon={Mail} title="No contacts yet" description="Add extra people connected to this customer, like a site manager or tenant." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {customer.contacts.map((contact) => (
                  <li key={contact.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                        {contact.full_name}
                        {contact.is_primary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      </p>
                      <p className="text-xs text-slate-500">
                        {[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Jobs</CardTitle>
          {office && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/jobs/new?customer_id=${customer.id}`}>
                <Plus className="h-3.5 w-3.5" /> New job
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs yet"
              description="Jobs for this customer will show up here once created."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <li key={job.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                      {job.job_number} — {job.job_name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {job.site ? `${job.site.label} · ` : ""}
                      {formatDateUK(job.start_date)}
                    </p>
                  </div>
                  <Badge variant={STATUS_TONE[job.status] ?? "secondary"} className="capitalize">
                    {job.status.replace(/_/g, " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {office && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Quotes</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link href={`/quotes/new?customer_id=${customer.id}`}><Plus className="h-3.5 w-3.5" /> New quote</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <EmptyState icon={FileText} title="No quotes yet" description="Build a quote for this customer." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {quotes.map((q) => (
                    <li key={q.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <Link href={`/quotes/${q.id}`} className="text-sm font-medium text-slate-900 hover:underline">{q.quote_number}</Link>
                        <p className="text-xs text-slate-500">{formatCurrencyGBP(q.grand_total)} · {formatDateUK(q.issue_date)}</p>
                      </div>
                      <Badge variant={QUOTE_STATUS_TONE[q.status] ?? "secondary"} className="capitalize">{q.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Invoices</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link href={`/invoices/new`}><Plus className="h-3.5 w-3.5" /> New invoice</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices yet" description="Invoices raised against this customer will show up here." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <Link href={`/invoices/${inv.id}`} className="text-sm font-medium text-slate-900 hover:underline">{inv.invoice_number}</Link>
                        <p className="text-xs text-slate-500">{formatCurrencyGBP(inv.total)} · Due {formatDateUK(inv.due_date)}</p>
                      </div>
                      <Badge variant={INVOICE_STATUS_TONE[inv.status] ?? "secondary"} className="capitalize">{inv.status.replace(/_/g, " ")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
