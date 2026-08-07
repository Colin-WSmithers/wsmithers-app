import { ComingSoon } from "@/components/shared/coming-soon";
import { Clock } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={Clock}
      title="Timesheets"
      description="Start/stop timers on jobs, review hours and compare estimated vs actual labour."
      phase="Phase 5 — Time & Costs"
    />
  );
}
