import { CustomerForm } from "../customer-form";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="page-title text-[1.375rem] leading-tight">New customer</h1>
        <p className="text-sm text-ink-500">You can add sites and contacts once the customer is created.</p>
      </div>
      <CustomerForm />
    </div>
  );
}
