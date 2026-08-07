import { ComingSoon } from "@/components/shared/coming-soon";
import { BarChart3 } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Reports"
      description="Job profitability, staff utilisation and business performance reporting."
      phase="Phase 7 — Polish"
    />
  );
}
