import { listAssignableStaff } from "@/lib/data/enquiries";
import { EnquiryForm } from "../enquiry-form";

export default async function NewEnquiryPage() {
  const staff = await listAssignableStaff();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="page-title text-[1.375rem] leading-tight">New enquiry</h1>
        <p className="text-sm text-ink-500">Log it now — you can convert it to a customer and quote later.</p>
      </div>
      <EnquiryForm staff={staff} />
    </div>
  );
}
