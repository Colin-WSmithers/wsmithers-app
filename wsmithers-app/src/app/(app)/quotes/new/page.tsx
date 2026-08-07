import { ComingSoon } from "@/components/shared/coming-soon";
import { FileText } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={FileText}
      title="New Quote"
      description="Build a quote from reusable line items and send it to the customer."
      phase="Phase 6"
    />
  );
}
