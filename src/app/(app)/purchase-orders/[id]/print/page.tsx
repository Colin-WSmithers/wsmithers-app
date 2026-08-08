import { notFound, redirect } from "next/navigation";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { getPurchaseOrderForPrint } from "@/lib/data/print-documents";
import { PrintDocument } from "@/components/shared/print-document";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";

export const metadata = { title: "Purchase order" };

export default async function PurchaseOrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/dashboard");

  const { id } = await params;
  const po = await getPurchaseOrderForPrint(id);
  if (!po) notFound();

  // Suppliers store a single free-text address; split it so it renders as a
  // proper block rather than one long line.
  const addressParts = (po.supplier?.address ?? "")
    .split(/\r?\n|,/)
    .map((p) => p.trim())
    .filter(Boolean);

  const supplierAsParty = po.supplier
    ? {
        display_name: po.supplier.name,
        company_name: po.supplier.contact_name ? `FAO ${po.supplier.contact_name}` : null,
        email: po.supplier.email,
        phone: po.supplier.phone,
        billing_address_line1: addressParts[0] ?? null,
        billing_address_line2: addressParts[1] ?? null,
        billing_city: addressParts[2] ?? null,
        billing_postcode: addressParts.slice(3).join(", ") || null,
      }
    : null;

  const meta = [
    { label: "Order date", value: formatDateUK(po.issue_date) },
    ...(po.expected_delivery_date
      ? [{ label: "Required by", value: formatDateUK(po.expected_delivery_date) }]
      : []),
    ...(po.supplier?.account_number ? [{ label: "Account", value: po.supplier.account_number }] : []),
  ];

  const totals = [
    { label: "Subtotal", value: formatCurrencyGBP(po.subtotal) },
    { label: "VAT", value: formatCurrencyGBP(po.vat_total) },
    { label: "Total", value: formatCurrencyGBP(po.total), emphasis: true },
  ];

  const deliveryNote = po.deliverTo
    ? `Deliver to site: ${[po.deliverTo.address_line1, po.deliverTo.city, po.deliverTo.postcode]
        .filter(Boolean)
        .join(", ")}.`
    : `Deliver to our yard unless otherwise agreed.`;

  return (
    <PrintDocument
      docLabel="Purchase Order"
      number={po.number}
      company={po.company}
      customer={supplierAsParty}
      site={po.deliverTo}
      lines={po.lines}
      showUnitColumn={false}
      meta={meta}
      totals={totals}
      partyLabel="Supplier"
      siteLabel="Deliver to"
      notes={
        [po.job ? `For job ${po.job.job_number} — ${po.job.job_name}.` : null, po.notes]
          .filter(Boolean)
          .join("\n\n") || null
      }
      terms={`${deliveryNote}\n\nPlease quote ${po.number} on your delivery note and invoice. Goods remain the property of the supplier until paid for; we reserve the right to reject any items not matching this order.`}
      footerNote={null}
      backHref={`/purchase-orders/${po.id}`}
      statusNote={
        po.status === "draft"
          ? "This purchase order is still a draft — approve and send it before ordering."
          : po.status === "cancelled"
            ? "This purchase order has been cancelled."
            : null
      }
    />
  );
}
