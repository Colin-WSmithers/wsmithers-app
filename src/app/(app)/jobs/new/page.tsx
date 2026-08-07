import { redirect } from "next/navigation";
import { listCustomersForPicker } from "@/lib/data/customers";
import { listSitesForPicker } from "@/lib/data/jobs";
import { listAssignableStaff } from "@/lib/data/staff";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { JobForm } from "../job-form";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string }>;
}) {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) {
    redirect("/jobs");
  }

  const { customer_id } = await searchParams;
  const [customers, sites, staff] = await Promise.all([
    listCustomersForPicker(),
    listSitesForPicker(),
    listAssignableStaff(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">New job</h1>
        <p className="text-sm text-slate-500">Create a job from scratch and assign the crew who&apos;ll work it.</p>
      </div>
      <JobForm customers={customers} sites={sites} staff={staff} defaultCustomerId={customer_id} />
    </div>
  );
}
