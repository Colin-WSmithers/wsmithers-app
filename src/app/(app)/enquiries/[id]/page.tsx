import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, MapPin, Calendar, FileText } from "lucide-react";
import { getEnquiryById } from "@/lib/data/enquiries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";
import { StatusSelect } from "./status-select";
import { ConvertToCustomerButton } from "./convert-button";

export default async function EnquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ convertError?: string }>;
}) {
  const { id } = await params;
  const { convertError } = await searchParams;
  const enquiry = await getEnquiryById(id);

  if (!enquiry) notFound();

  const name = enquiry.company_name || [enquiry.first_name, enquiry.last_name].filter(Boolean).join(" ") || "Unnamed enquiry";

  return (
    <div className="flex flex-col gap-6">
      {convertError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{convertError}</p>
      )}
      <div className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title text-[1.375rem] leading-tight">{name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
            {enquiry.email && (
              <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {enquiry.email}</span>
            )}
            {enquiry.phone && (
              <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {enquiry.phone}</span>
            )}
            {enquiry.site_address && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {enquiry.site_address}</span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Received {formatDateUK(enquiry.date_received)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StatusSelect enquiryId={enquiry.id} currentStatus={enquiry.status} />
          {enquiry.converted_customer_id ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/customers/${enquiry.converted_customer_id}`}>View customer</Link>
            </Button>
          ) : (
            <ConvertToCustomerButton enquiryId={enquiry.id} />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Description" value={enquiry.description ?? "—"} full />
          <Detail label="Estimated value" value={enquiry.estimated_value ? formatCurrencyGBP(enquiry.estimated_value) : "—"} />
          <Detail label="Source" value={enquiry.source ?? "—"} />
          <Detail label="Next action" value={formatDateUK(enquiry.next_action_date)} />
          {enquiry.notes && <Detail label="Notes" value={enquiry.notes} full />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quote</CardTitle>
        </CardHeader>
        <CardContent>
          {enquiry.converted_quote_id ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/quotes/${enquiry.converted_quote_id}`}>
                <FileText className="h-3.5 w-3.5" /> View quote
              </Link>
            </Button>
          ) : enquiry.converted_customer_id ? (
            <Button asChild size="sm">
              <Link
                href={`/quotes/new?customer_id=${enquiry.converted_customer_id}&enquiry_id=${enquiry.id}&description=${encodeURIComponent(enquiry.description ?? "")}`}
              >
                <FileText className="h-3.5 w-3.5" /> Build a quote
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-ink-500">Convert this enquiry to a customer first, then you can build a quote for them.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-ink-800">{value}</p>
    </div>
  );
}
