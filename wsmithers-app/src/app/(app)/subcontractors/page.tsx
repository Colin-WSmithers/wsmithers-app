import { ComingSoon } from "@/components/shared/coming-soon";
import { HardHat } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={HardHat}
      title="Subcontractors"
      description="Store subcontractor details, rates and trades, and assign them to jobs and appointments."
      phase="Phase 3 — Job Management"
    />
  );
}
