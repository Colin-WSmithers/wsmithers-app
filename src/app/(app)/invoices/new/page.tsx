import { redirect } from "next/navigation";
import { listCustomersForPicker } from "@/lib/data/customers";
import { listJobsForInvoicePicker } from "@/lib/data/jobs";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { InvoiceForm } from "../invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ job_id?: string }>;
}) {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/invoices");

  const { job_id } = await searchParams;
  const [customers, jobs] = await Promise.all([listCustomersForPicker(), listJobsForInvoicePicker()]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="page-title text-[1.375rem] leading-tight">New invoice</h1>
        <p className="text-sm text-ink-500">Raise a deposit, progress, final or standalone invoice.</p>
      </div>
      <InvoiceForm customers={customers} jobs={jobs} defaultJobId={job_id} />
    </div>
  );
}
