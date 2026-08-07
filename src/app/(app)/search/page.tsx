import Link from "next/link";
import { Search as SearchIcon, Briefcase, Users, FileText, Receipt, ClipboardList, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";

function escapeLike(value: string) {
  return value.replace(/[%_]/g, (m) => `\\${m}`);
}

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
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (query.length < 2) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-slate-900">Search</h1>
        <EmptyState
          icon={SearchIcon}
          title="Type at least 2 characters"
          description="Search across jobs, customers, enquiries, quotes, invoices and purchase orders."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const like = `%${escapeLike(query)}%`;

  const [customers, jobs, enquiries, quotes, invoices, purchaseOrders] = await Promise.all([
    supabase
      .from("customers")
      .select("id, display_name, email")
      .or(`display_name.ilike.${like},email.ilike.${like}`)
      .limit(8),
    supabase
      .from("jobs")
      .select("id, job_number, job_name")
      .or(`job_number.ilike.${like},job_name.ilike.${like}`)
      .limit(8),
    supabase
      .from("enquiries")
      .select("id, first_name, last_name, company_name, description")
      .or(`first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},description.ilike.${like}`)
      .limit(8),
    supabase
      .from("quotes")
      .select("id, quote_number, status")
      .ilike("quote_number", like)
      .limit(8),
    supabase
      .from("invoices")
      .select("id, invoice_number, status")
      .ilike("invoice_number", like)
      .limit(8),
    supabase
      .from("purchase_orders")
      .select("id, po_number, status")
      .ilike("po_number", like)
      .limit(8),
  ]);

  const groups: ResultGroup[] = [
    {
      key: "customers",
      label: "Customers",
      icon: Users,
      rows: (customers.data ?? []).map((c) => ({
        id: c.id,
        href: `/customers/${c.id}`,
        title: c.display_name,
        subtitle: c.email ?? "",
      })),
    },
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
  ];

  const totalResults = groups.reduce((sum, g) => sum + g.rows.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Search results for &ldquo;{query}&rdquo;</h1>
        <p className="text-sm text-slate-500">{totalResults} result{totalResults === 1 ? "" : "s"}</p>
      </div>

      {totalResults === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matches"
          description="Try a different job number, customer name, or document reference."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups
            .filter((g) => g.rows.length > 0)
            .map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <group.icon className="h-3.5 w-3.5" /> {group.label}
                </h2>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {group.rows.map((row, i) => (
                    <Link
                      key={row.id}
                      href={row.href}
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 ${
                        i > 0 ? "border-t border-slate-100" : ""
                      }`}
                    >
                      <span className="font-medium text-slate-900">{row.title}</span>
                      <span className="truncate text-slate-500 capitalize">{row.subtitle}</span>
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
