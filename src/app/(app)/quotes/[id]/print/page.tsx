import { notFound, redirect } from "next/navigation";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { getQuoteForPrint } from "@/lib/data/print-documents";
import { PrintDocument } from "@/components/shared/print-document";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";

export const metadata = { title: "Quote" };

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/dashboard");

  const { id } = await params;
  const quote = await getQuoteForPrint(id);
  if (!quote) notFound();

  const meta = [
    { label: "Date", value: formatDateUK(quote.issue_date) },
    ...(quote.expiry_date ? [{ label: "Valid until", value: formatDateUK(quote.expiry_date) }] : []),
  ];

  const totals = [
    ...(quote.discount_amount > 0
      ? [
          { label: "Subtotal before discount", value: formatCurrencyGBP(quote.subtotal + quote.discount_amount), muted: true },
          { label: "Discount", value: `− ${formatCurrencyGBP(quote.discount_amount)}`, muted: true },
        ]
      : []),
    { label: "Subtotal", value: formatCurrencyGBP(quote.subtotal) },
    { label: "VAT", value: formatCurrencyGBP(quote.vat_total) },
    { label: "Total", value: formatCurrencyGBP(quote.total), emphasis: true },
  ];

  return (
    <PrintDocument
      docLabel="Quotation"
      number={quote.number}
      company={quote.company}
      customer={quote.customer}
      site={quote.site}
      lines={quote.lines}
      showUnitColumn
      meta={meta}
      totals={totals}
      notes={quote.description ? `${quote.description}${quote.notes ? `\n\n${quote.notes}` : ""}` : quote.notes}
      terms={quote.terms ?? quote.company?.quote_terms ?? null}
      footerNote={
        quote.expiry_date
          ? `This quotation is valid until ${formatDateUK(quote.expiry_date)}. Prices are subject to survey and may change if the scope of works alters.`
          : "Prices are subject to survey and may change if the scope of works alters."
      }
      backHref={`/quotes/${quote.id}`}
      statusNote={quote.status === "draft" ? "This quote is still a draft — mark it as sent once you've issued it." : null}
    />
  );
}
