import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, MapPin, Briefcase } from "lucide-react";
import { getQuoteById } from "@/lib/data/quotes";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";
import { QuoteStatusSelect } from "./quote-status-select";
import { AcceptQuoteButton } from "./accept-quote-button";

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/quotes");

  const quote = await getQuoteById(id);
  if (!quote) notFound();

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title text-[1.375rem] leading-tight">{quote.quote_number}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
            <span>{quote.customer?.display_name ?? "—"}</span>
            {quote.site && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {quote.site.address_line1}, {quote.site.postcode}</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {quote.status === "accepted" ? (
            <Badge variant="success">Accepted</Badge>
          ) : (
            <QuoteStatusSelect quoteId={quote.id} currentStatus={quote.status} />
          )}
          {quote.converted_job_id ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/jobs/${quote.converted_job_id}`}><Briefcase className="h-3.5 w-3.5" /> View job</Link>
            </Button>
          ) : (
            quote.status !== "rejected" && quote.status !== "expired" && <AcceptQuoteButton quoteId={quote.id} />
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
                  <TableHead>Unit</TableHead>
                  <TableHead>Unit price</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.description}
                      {item.category && <p className="text-xs text-ink-400">{item.category}</p>}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{formatCurrencyGBP(item.unit_price)}</TableCell>
                    <TableCell>{item.vat_rate}%</TableCell>
                    <TableCell>{formatCurrencyGBP(item.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              {quote.discount_amount > 0 && <span className="text-ink-500">Discount: -{formatCurrencyGBP(quote.discount_amount)}</span>}
              <span className="text-ink-500">Subtotal: {formatCurrencyGBP(quote.subtotal)}</span>
              <span className="text-ink-500">VAT: {formatCurrencyGBP(quote.vat_total)}</span>
              <span className="text-base font-semibold text-ink-900">Total: {formatCurrencyGBP(quote.grand_total)}</span>
            </div>
            {quote.terms && (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Terms</p>
                <p className="whitespace-pre-wrap text-sm text-ink-700">{quote.terms}</p>
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
              <Link href={`/customers`} className="font-medium text-ink-900 hover:underline">{quote.customer?.display_name}</Link>
              {quote.customer?.email && (
                <p className="flex items-center gap-1.5 text-ink-600"><Mail className="h-3.5 w-3.5 text-ink-400" /> {quote.customer.email}</p>
              )}
              {quote.customer?.phone && (
                <p className="flex items-center gap-1.5 text-ink-600"><Phone className="h-3.5 w-3.5 text-ink-400" /> {quote.customer.phone}</p>
              )}
              <div className="mt-2 border-t border-ink-100 pt-2 text-xs text-ink-500">
                <p>Issued {formatDateUK(quote.issue_date)}</p>
                {quote.expiry_date && <p>Expires {formatDateUK(quote.expiry_date)}</p>}
              </div>
            </CardContent>
          </Card>
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-ink-700">{quote.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
