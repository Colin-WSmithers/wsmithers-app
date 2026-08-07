import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { listQuotes } from "@/lib/data/quotes";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";

const STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  draft: "secondary", sent: "info", viewed: "info", accepted: "success", rejected: "destructive", expired: "destructive",
};

export default async function QuotesPage() {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/dashboard");

  const quotes = await listQuotes();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Quotes</h1>
          <p className="text-sm text-slate-500">Build, send and track quotes — accept one to create a job automatically.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/quotes/new"><Plus className="h-4 w-4" /> New Quote</Link>
        </Button>
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          description="Build a quote from reusable line items and send it to a customer."
          actionLabel="New Quote"
          actionHref="/quotes/new"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <Link href={`/quotes/${q.id}`} className="font-medium text-slate-900 hover:underline">
                      {q.quote_number}
                    </Link>
                  </TableCell>
                  <TableCell>{q.customer?.display_name ?? "—"}</TableCell>
                  <TableCell>{formatCurrencyGBP(q.grand_total)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[q.status] ?? "secondary"} className="capitalize">{q.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDateUK(q.issue_date)}</TableCell>
                  <TableCell>{formatDateUK(q.expiry_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
