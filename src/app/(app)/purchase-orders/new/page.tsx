import { redirect } from "next/navigation";
import { listSuppliersForPicker } from "@/lib/data/suppliers";
import { listJobs } from "@/lib/data/jobs";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { PoForm } from "../po-form";

export default async function NewPurchaseOrderPage() {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/purchase-orders");

  const [suppliers, jobs] = await Promise.all([listSuppliersForPicker(), listJobs()]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="page-title text-[1.375rem] leading-tight">New purchase order</h1>
        <p className="text-sm text-ink-500">Raise an order with a supplier, optionally tied to a job.</p>
      </div>
      <PoForm suppliers={suppliers} jobs={jobs.map((j) => ({ id: j.id, job_number: j.job_number, job_name: j.job_name }))} />
    </div>
  );
}
