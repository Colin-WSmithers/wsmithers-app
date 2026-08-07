import { ComingSoon } from "@/components/shared/coming-soon";
import { Briefcase } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={Briefcase}
      title="New Job"
      description="Full job creation (from scratch or converted from an accepted quote)."
      phase="Phase 3"
    />
  );
}
