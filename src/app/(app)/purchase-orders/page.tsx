import Link from "next/link";
import { ShoppingCart, Plus } from "lucide-react";
import { listPurchaseOrders } from "@/lib/data/purchase-orders";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";

const STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  draft: "secondary", awaiting_approval: "warning", approved: "info", sent: "info",
  partially_received: "warning", received: "success", cancelled: "destructive",
};

export default async function PurchaseOrdersPage() {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/dashboard");

  const pos = await listPurchaseOrders();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Orders raised with suppliers, with costs flowing into job costing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/purchase-orders/new"><Plus className="h-4 w-4" /> New PO</Link>
          </Button>
        </div>
      </div>

      {pos.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchase orders yet"
          description="Raise a PO against a supplier to track materials spend against a job."
          actionLabel="New PO"
          actionHref="/purchase-orders/new"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((po) => (
                <TableRow key={po.id}>
                  <TableCell>
                    <Link href={`/purchase-orders/${po.id}`} className="font-medium text-slate-900 hover:underline">
                      {po.po_number}
                    </Link>
                  </TableCell>
                  <TableCell>{po.supplier?.name ?? "—"}</TableCell>
                  <TableCell>
                    {po.job ? (
                      <Link href={`/jobs/${po.job.id}`} className="text-slate-600 hover:underline">{po.job.job_number}</Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{formatCurrencyGBP(po.grand_total)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[po.status] ?? "secondary"} className="capitalize">
                      {po.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateUK(po.issue_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
