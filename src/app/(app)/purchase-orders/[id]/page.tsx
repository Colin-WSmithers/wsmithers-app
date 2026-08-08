import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { getPurchaseOrderById } from "@/lib/data/purchase-orders";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";
import { PoStatusSelect } from "../po-status-select";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/purchase-orders");

  const po = await getPurchaseOrderById(id);
  if (!po) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title text-[1.375rem] leading-tight">{po.po_number}</h1>
          <p className="text-sm text-ink-500">
            {po.supplier?.name ?? "—"}
            {po.job && (
              <>
                {" · "}
                <Link href={`/jobs/${po.job.id}`} className="hover:underline">{po.job.job_number} — {po.job.job_name}</Link>
              </>
            )}
          </p>
        </div>
        <PoStatusSelect poId={po.id} currentStatus={po.status} />
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
                {po.items.map((item) => (
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
              <span className="text-ink-500">Subtotal: {formatCurrencyGBP(po.subtotal)}</span>
              <span className="text-ink-500">VAT: {formatCurrencyGBP(po.vat_total)}</span>
              <span className="text-base font-semibold text-ink-900">Total: {formatCurrencyGBP(po.grand_total)}</span>
            </div>
            {po.notes && (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-ink-700">{po.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="font-medium text-ink-900">{po.supplier?.name}</p>
            {po.supplier?.contact_name && <p className="text-ink-600">{po.supplier.contact_name}</p>}
            {po.supplier?.phone && (
              <p className="flex items-center gap-1.5 text-ink-600"><Phone className="h-3.5 w-3.5 text-ink-400" /> {po.supplier.phone}</p>
            )}
            {po.supplier?.email && (
              <p className="flex items-center gap-1.5 text-ink-600"><Mail className="h-3.5 w-3.5 text-ink-400" /> {po.supplier.email}</p>
            )}
            <div className="mt-2 border-t border-ink-100 pt-2 text-xs text-ink-500">
              <p>Issued {formatDateUK(po.issue_date)}</p>
              {po.expected_delivery_date && <p>Expected {formatDateUK(po.expected_delivery_date)}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
