import { ComingSoon } from "@/components/shared/coming-soon";
import { Receipt } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={Receipt}
      title="New Invoice"
      description="Raise a deposit, progress or final invoice from a job."
      phase="Phase 6"
    />
  );
}
