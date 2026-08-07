import Link from "next/link";
import { Inbox, Plus } from "lucide-react";
import { listEnquiries } from "@/lib/data/enquiries";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";
import type { EnquiryStatus } from "@/lib/supabase/types";
import { ENQUIRY_STATUSES } from "@/lib/validation/enquiries";

const STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  new: "info",
  contacted: "secondary",
  site_visit_required: "warning",
  quote_required: "warning",
  quote_sent: "info",
  won: "success",
  lost: "destructive",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const validStatus = ENQUIRY_STATUSES.includes(status as EnquiryStatus) ? (status as EnquiryStatus) : undefined;
  const enquiries = await listEnquiries(validStatus);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Enquiries</h1>
          <p className="text-sm text-slate-500">New leads, waiting to become quotes and jobs.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/enquiries/new">
            <Plus className="h-4 w-4" /> New Enquiry
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link href="/enquiries">
          <Badge variant={!validStatus ? "default" : "outline"} className="cursor-pointer capitalize">
            All
          </Badge>
        </Link>
        {ENQUIRY_STATUSES.map((s) => (
          <Link key={s} href={`/enquiries?status=${s}`}>
            <Badge variant={validStatus === s ? "default" : "outline"} className="cursor-pointer capitalize">
              {statusLabel(s)}
            </Badge>
          </Link>
        ))}
      </div>

      {enquiries.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No enquiries here"
          description="Log a new enquiry as soon as someone gets in touch, and track it through to a quote."
          actionLabel="Log an enquiry"
          actionHref="/enquiries/new"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enquiry</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((enquiry) => (
                <TableRow key={enquiry.id}>
                  <TableCell>
                    <Link href={`/enquiries/${enquiry.id}`} className="font-medium text-slate-900 hover:underline">
                      {enquiry.company_name || [enquiry.first_name, enquiry.last_name].filter(Boolean).join(" ") || "Unnamed"}
                    </Link>
                    <p className="text-xs text-slate-500">{enquiry.email ?? enquiry.phone ?? ""}</p>
                  </TableCell>
                  <TableCell>{formatDateUK(enquiry.date_received)}</TableCell>
                  <TableCell>{enquiry.estimated_value ? formatCurrencyGBP(enquiry.estimated_value) : "—"}</TableCell>
                  <TableCell>{enquiry.assigned_to_profile?.full_name ?? "Unassigned"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[enquiry.status] ?? "secondary"} className="capitalize">
                      {statusLabel(enquiry.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
