import { notFound, redirect } from "next/navigation";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { getInvoiceForPrint } from "@/lib/data/print-documents";
import { PrintDocument } from "@/components/shared/print-document";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";

export const metadata = { title: "Invoice" };

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/dashboard");

  const { id } = await params;
  const invoice = await getInvoiceForPrint(id);
  if (!invoice) notFound();

  const outstanding = Math.round((invoice.total - invoice.amount_paid) * 100) / 100;

  const meta = [
    { label: "Invoice date", value: formatDateUK(invoice.issue_date) },
    { label: "Payment due", value: formatDateUK(invoice.due_date) },
  ];

  const totals = [
    { label: "Subtotal", value: formatCurrencyGBP(invoice.subtotal) },
    { label: "VAT", value: formatCurrencyGBP(invoice.vat_total) },
    { label: "Total", value: formatCurrencyGBP(invoice.total), emphasis: true },
    ...(invoice.amount_paid > 0
      ? [
          { label: "Paid to date", value: `− ${formatCurrencyGBP(invoice.amount_paid)}`, muted: true },
          { label: "Amount due", value: formatCurrencyGBP(outstanding), emphasis: true },
        ]
      : []),
  ];

  const paymentHistory =
    invoice.payments.length > 0
      ? `Payments received:\n${invoice.payments
          .map(
            (p) =>
              `${formatDateUK(p.paid_date)} — ${formatCurrencyGBP(Number(p.amount))} (${p.method.replace(/_/g, " ")}${
                p.reference ? `, ref ${p.reference}` : ""
              })`
          )
          .join("\n")}`
      : null;

  const notes = [invoice.notes, paymentHistory].filter(Boolean).join("\n\n") || null;

  return (
    <PrintDocument
      docLabel={invoice.status === "paid" ? "Receipt" : "Invoice"}
      number={invoice.number}
      company={invoice.company}
      customer={invoice.customer}
      site={invoice.site}
      lines={invoice.lines}
      showUnitColumn={false}
      meta={meta}
      totals={totals}
      notes={notes}
      terms={invoice.terms ?? invoice.company?.invoice_terms ?? null}
      footerNote={
        outstanding > 0
          ? `Please settle ${formatCurrencyGBP(outstanding)} by ${formatDateUK(invoice.due_date)}, quoting ${invoice.number} as the payment reference.`
          : "Thank you — this invoice has been paid in full."
      }
      backHref={`/invoices/${invoice.id}`}
      statusNote={
        invoice.status === "draft"
          ? "This invoice is still a draft — mark it as sent once you've issued it."
          : invoice.status === "void"
            ? "This invoice has been voided."
            : null
      }
    />
  );
}
