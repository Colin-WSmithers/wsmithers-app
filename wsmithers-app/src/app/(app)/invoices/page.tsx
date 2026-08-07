import { ComingSoon } from "@/components/shared/coming-soon";
import { Receipt } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={Receipt}
      title="Invoices"
      description="Create invoices from jobs or quotes, track payments, and see what's overdue at a glance."
      phase="Phase 6 — Commercial"
    />
  );
}
