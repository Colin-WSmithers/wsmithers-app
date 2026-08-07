import { ComingSoon } from "@/components/shared/coming-soon";
import { FileText } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={FileText}
      title="Quotes"
      description="Build quotes from reusable line items, send them, and convert accepted quotes straight into jobs."
      phase="Phase 6 — Commercial"
    />
  );
}
