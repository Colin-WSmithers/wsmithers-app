import { ComingSoon } from "@/components/shared/coming-soon";
import { Inbox } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={Inbox}
      title="Enquiries"
      description="Log new enquiries and convert them into customers, quotes and jobs without re-entering data."
      phase="Phase 2 — CRM"
    />
  );
}
