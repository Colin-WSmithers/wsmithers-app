import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Printer } from "lucide-react";
import { getInvoiceById } from "@/lib/data/invoices";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";
import { InvoiceStatusSelect } from "./invoice-status-select";
import { RecordPaymentDialog } from "./record-payment-dialog";

const STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  draft: "secondary", sent: "info", viewed: "info", part_paid: "warning", paid: "success", overdue: "destructive", void: "destructive",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/invoices");

  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const outstanding = Math.max(0, invoice.total - invoice.amount_paid);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title text-[1.375rem] leading-tight">{invoice.invoice_number}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
            <span>{invoice.customer?.display_name ?? "—"}</span>
            {invoice.job && (
              <Link href={`/jobs/${invoice.job.id}`} className="hover:underline">{invoice.job.job_number} — {invoice.job.job_name}</Link>
            )}
            <span className="capitalize">{invoice.kind}</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Badge variant={STATUS_TONE[invoice.status] ?? "secondary"} className="w-fit capitalize">
            {invoice.status.replace(/_/g, " ")}
          </Badge>
          <InvoiceStatusSelect invoiceId={invoice.id} currentStatus={invoice.status} />
          <Button asChild size="sm" variant="outline">
            <Link href={`/invoices/${invoice.id}/print`}>
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </Link>
          </Button>
          {outstanding > 0 && invoice.status !== "void" && invoice.status !== "draft" && (
            <RecordPaymentDialog invoiceId={invoice.id} outstanding={outstanding} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit price</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrencyGBP(item.unit_price)}</TableCell>
                    <TableCell>{item.vat_rate}%</TableCell>
                    <TableCell>{formatCurrencyGBP(item.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <span className="text-ink-500">Subtotal: {formatCurrencyGBP(invoice.subtotal)}</span>
              <span className="text-ink-500">VAT: {formatCurrencyGBP(invoice.vat_total)}</span>
              <span className="text-base font-semibold text-ink-900">Total: {formatCurrencyGBP(invoice.total)}</span>
              <span className="text-ink-500">Paid: {formatCurrencyGBP(invoice.amount_paid)}</span>
              {outstanding > 0 && <span className="font-medium text-red-600">Outstanding: {formatCurrencyGBP(outstanding)}</span>}
            </div>
            {invoice.terms && (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Terms</p>
                <p className="whitespace-pre-wrap text-sm text-ink-700">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p className="font-medium text-ink-900">{invoice.customer?.display_name}</p>
              {invoice.customer?.email && (
                <p className="flex items-center gap-1.5 text-ink-600"><Mail className="h-3.5 w-3.5 text-ink-400" /> {invoice.customer.email}</p>
              )}
              {invoice.customer?.phone && (
                <p className="flex items-center gap-1.5 text-ink-600"><Phone className="h-3.5 w-3.5 text-ink-400" /> {invoice.customer.phone}</p>
              )}
              <div className="mt-2 border-t border-ink-100 pt-2 text-xs text-ink-500">
                <p>Issued {formatDateUK(invoice.issue_date)}</p>
                <p>Due {formatDateUK(invoice.due_date)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-ink-500">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink-900">{formatCurrencyGBP(p.amount)}</span>
                        <span className="text-xs capitalize text-ink-500">{p.method.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-xs text-ink-400">{formatDateUK(p.paid_date)}{p.reference ? ` · ${p.reference}` : ""}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
