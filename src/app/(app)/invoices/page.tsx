import Link from "next/link";
import { Receipt, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { listInvoices } from "@/lib/data/invoices";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";

const STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  draft: "secondary", sent: "info", viewed: "info", part_paid: "warning", paid: "success", overdue: "destructive", void: "destructive",
};

export default async function InvoicesPage() {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/dashboard");

  const invoices = await listInvoices();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title text-[1.375rem] leading-tight">Invoices</h1>
          <p className="text-sm text-ink-500">Track what&apos;s owed and record payments as they land.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link>
        </Button>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Raise a deposit, progress or final invoice from a job."
          actionLabel="New Invoice"
          actionHref="/invoices/new"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-ink-900 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.customer?.display_name ?? "—"}</TableCell>
                  <TableCell>
                    {inv.job ? (
                      <Link href={`/jobs/${inv.job.id}`} className="text-ink-600 hover:underline">{inv.job.job_number}</Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{formatCurrencyGBP(inv.total)}</TableCell>
                  <TableCell>{formatCurrencyGBP(inv.amount_paid)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[inv.status] ?? "secondary"} className="capitalize">
                      {inv.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateUK(inv.due_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
