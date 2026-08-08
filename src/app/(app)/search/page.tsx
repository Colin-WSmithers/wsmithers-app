import Link from "next/link";
import {
  Search as SearchIcon, Briefcase, Users, FileText, Receipt, ClipboardList,
  ShoppingCart, HardHat, Truck, MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ilikeAnyFilter, ilikePattern } from "@/lib/utils";

export const metadata = { title: "Search" };

interface ResultRow {
  id: string;
  href: string;
  title: string;
  subtitle: string;
}

interface ResultGroup {
  key: string;
  label: string;
  icon: typeof Briefcase;
  rows: ResultRow[];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireProfile();
  const office = isOfficeOrAdmin(profile.role);
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (query.length < 2) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader eyebrow="Search" title="Search" />
        <EmptyState
          icon={SearchIcon}
          title="Type at least 2 characters"
          description={
            office
              ? "Search across jobs, customers, sites, enquiries, quotes, invoices, purchase orders, suppliers and subcontractors."
              : "Search the jobs and sites you're assigned to."
          }
        />
      </div>
    );
  }

  const supabase = await createClient();
  const pattern = ilikePattern(query);

  // Everything below is additionally constrained by RLS, so a tradesperson
  // simply gets no rows back from the office-only tables. The `office` flag
  // just avoids issuing pointless queries.
  const [customers, jobs, sites, enquiries, quotes, invoices, purchaseOrders, suppliers, subcontractors] =
    await Promise.all([
      office
        ? supabase
            .from("customers")
            .select("id, display_name, email, company_name")
            .is("deleted_at", null)
            .or(ilikeAnyFilter(["display_name", "company_name", "email", "phone"], query))
            .limit(8)
        : Promise.resolve({ data: [] }),
      supabase
        .from("jobs")
        .select("id, job_number, job_name")
        .is("deleted_at", null)
        .or(ilikeAnyFilter(["job_number", "job_name", "description"], query))
        .limit(8),
      supabase
        .from("sites")
        .select("id, label, address_line1, postcode, customer_id")
        .or(ilikeAnyFilter(["label", "address_line1", "city", "postcode"], query))
        .limit(6),
      office
        ? supabase
            .from("enquiries")
            .select("id, first_name, last_name, company_name, description")
            .is("deleted_at", null)
            .or(ilikeAnyFilter(["first_name", "last_name", "company_name", "description", "email", "phone"], query))
            .limit(8)
        : Promise.resolve({ data: [] }),
      office
        ? supabase
            .from("quotes")
            .select("id, quote_number, status, grand_total")
            .is("deleted_at", null)
            .ilike("quote_number", pattern)
            .limit(6)
        : Promise.resolve({ data: [] }),
      office
        ? supabase
            .from("invoices")
            .select("id, invoice_number, status")
            .is("deleted_at", null)
            .ilike("invoice_number", pattern)
            .limit(6)
        : Promise.resolve({ data: [] }),
      office
        ? supabase.from("purchase_orders").select("id, po_number, status").ilike("po_number", pattern).limit(6)
        : Promise.resolve({ data: [] }),
      office
        ? supabase
            .from("suppliers")
            .select("id, name, contact_name")
            .or(ilikeAnyFilter(["name", "contact_name", "email"], query))
            .limit(6)
        : Promise.resolve({ data: [] }),
      office
        ? supabase
            .from("subcontractors")
            .select("id, name, trade")
            .or(ilikeAnyFilter(["name", "company_name", "trade", "email"], query))
            .limit(6)
        : Promise.resolve({ data: [] }),
    ]);

  const groups: ResultGroup[] = [
    {
      key: "jobs",
      label: "Jobs",
      icon: Briefcase,
      rows: (jobs.data ?? []).map((j) => ({
        id: j.id,
        href: `/jobs/${j.id}`,
        title: j.job_number,
        subtitle: j.job_name,
      })),
    },
    {
      key: "customers",
      label: "Customers",
      icon: Users,
      rows: (customers.data ?? []).map((c) => ({
        id: c.id,
        href: `/customers/${c.id}`,
        title: c.display_name,
        subtitle: c.company_name ?? c.email ?? "",
      })),
    },
    {
      key: "sites",
      label: "Sites",
      icon: MapPin,
      rows: (sites.data ?? []).map((s) => ({
        id: s.id,
        href: `/customers/${s.customer_id}`,
        title: s.label,
        subtitle: `${s.address_line1}, ${s.postcode}`,
      })),
    },
    {
      key: "enquiries",
      label: "Enquiries",
      icon: ClipboardList,
      rows: (enquiries.data ?? []).map((e) => ({
        id: e.id,
        href: `/enquiries/${e.id}`,
        title: e.company_name || [e.first_name, e.last_name].filter(Boolean).join(" ") || "Enquiry",
        subtitle: e.description ?? "",
      })),
    },
    {
      key: "quotes",
      label: "Quotes",
      icon: FileText,
      rows: (quotes.data ?? []).map((qt) => ({
        id: qt.id,
        href: `/quotes/${qt.id}`,
        title: qt.quote_number,
        subtitle: qt.status.replace(/_/g, " "),
      })),
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: Receipt,
      rows: (invoices.data ?? []).map((inv) => ({
        id: inv.id,
        href: `/invoices/${inv.id}`,
        title: inv.invoice_number,
        subtitle: inv.status.replace(/_/g, " "),
      })),
    },
    {
      key: "purchase-orders",
      label: "Purchase orders",
      icon: ShoppingCart,
      rows: (purchaseOrders.data ?? []).map((po) => ({
        id: po.id,
        href: `/purchase-orders/${po.id}`,
        title: po.po_number,
        subtitle: po.status.replace(/_/g, " "),
      })),
    },
    {
      key: "suppliers",
      label: "Suppliers",
      icon: Truck,
      rows: (suppliers.data ?? []).map((s) => ({
        id: s.id,
        href: "/purchase-orders",
        title: s.name,
        subtitle: s.contact_name ?? "",
      })),
    },
    {
      key: "subcontractors",
      label: "Subcontractors",
      icon: HardHat,
      rows: (subcontractors.data ?? []).map((s) => ({
        id: s.id,
        href: "/subcontractors",
        title: s.name,
        subtitle: s.trade ?? "",
      })),
    },
  ];

  const populated = groups.filter((g) => g.rows.length > 0);
  const totalResults = populated.reduce((sum, g) => sum + g.rows.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Search"
        title={`“${query}”`}
        description={`${totalResults} result${totalResults === 1 ? "" : "s"}`}
      />

      {totalResults === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matches"
          description="Try a different job number, customer name, postcode or document reference."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {populated.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <h2 className="eyebrow flex items-center gap-1.5">
                <group.icon className="h-3.5 w-3.5" /> {group.label}
              </h2>
              <div className="overflow-hidden rounded-card border border-ink-200/80 bg-white shadow-subtle">
                {group.rows.map((row, i) => (
                  <Link
                    key={row.id}
                    href={row.href}
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-brand-50/50 ${
                      i > 0 ? "border-t border-ink-100" : ""
                    }`}
                  >
                    <span className="font-medium text-ink-900">{row.title}</span>
                    <span className="truncate capitalize text-ink-500">{row.subtitle}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
