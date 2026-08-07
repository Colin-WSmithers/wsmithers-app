import { redirect } from "next/navigation";
import { listCustomersForPicker } from "@/lib/data/customers";
import { listSitesForPicker } from "@/lib/data/jobs";
import { listQuoteItemTemplates } from "@/lib/data/quotes";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { QuoteForm } from "../quote-form";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; enquiry_id?: string; description?: string }>;
}) {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/quotes");

  const { customer_id, enquiry_id, description } = await searchParams;
  const [customers, sites, templates] = await Promise.all([
    listCustomersForPicker(),
    listSitesForPicker(),
    listQuoteItemTemplates(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">New quote</h1>
        <p className="text-sm text-slate-500">Add line items — VAT and totals are calculated automatically.</p>
      </div>
      <QuoteForm
        customers={customers}
        sites={sites}
        templates={templates}
        defaultCustomerId={customer_id}
        defaultEnquiryId={enquiry_id}
        defaultDescription={description}
      />
    </div>
  );
}
