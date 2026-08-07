import { ComingSoon } from "@/components/shared/coming-soon";
import { UserCog } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={UserCog}
      title="Staff"
      description="Manage employee profiles, roles and permissions."
      phase="Phase 1 — Foundation (user management)"
    />
  );
}
