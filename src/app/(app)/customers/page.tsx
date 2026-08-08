import Link from "next/link";
import { Users, Plus, Search, MapPin } from "lucide-react";
import { listCustomers } from "@/lib/data/customers";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const customers = await listCustomers(q);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="page-title text-[1.375rem] leading-tight">Customers</h1>
          <p className="text-sm text-ink-500">Every customer, their sites and contact details in one place.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/customers/new">
            <Plus className="h-4 w-4" /> New Customer
          </Link>
        </Button>
      </div>

      <form className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <Input name="q" defaultValue={q} placeholder="Search name, company, email, phone…" className="pl-8" />
      </form>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? "No customers match that search" : "No customers yet"}
          description={
            q
              ? "Try a different name, company, email or phone number."
              : "Add your first customer, or they'll be created automatically when you convert an accepted enquiry."
          }
          actionLabel={q ? undefined : "Add a customer"}
          actionHref={q ? undefined : "/customers/new"}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Billing area</TableHead>
                <TableHead>Sites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link href={`/customers/${customer.id}`} className="font-medium text-ink-900 hover:underline">
                      {customer.display_name}
                    </Link>
                    {customer.company_name && <p className="text-xs text-ink-500">{customer.company_name}</p>}
                  </TableCell>
                  <TableCell>
                    <p className="text-ink-700">{customer.email ?? "—"}</p>
                    <p className="text-xs text-ink-500">{customer.phone ?? ""}</p>
                  </TableCell>
                  <TableCell>
                    {customer.billing_city || customer.billing_postcode ? (
                      <span className="inline-flex items-center gap-1 text-ink-600">
                        <MapPin className="h-3.5 w-3.5 text-ink-400" />
                        {[customer.billing_city, customer.billing_postcode].filter(Boolean).join(", ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{customer.site_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
