import { ComingSoon } from "@/components/shared/coming-soon";
import { Users } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={Users}
      title="Customers"
      description="Central customer profiles with contacts, sites, jobs, quotes, invoices and history."
      phase="Phase 2 — CRM"
    />
  );
}
