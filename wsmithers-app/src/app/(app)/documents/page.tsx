import { ComingSoon } from "@/components/shared/coming-soon";
import { FolderOpen } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={FolderOpen}
      title="Documents"
      description="All job and customer documents in one searchable place."
      phase="Phase 3 — Job Management"
    />
  );
}
