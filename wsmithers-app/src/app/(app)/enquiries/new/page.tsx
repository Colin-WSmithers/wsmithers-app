import { ComingSoon } from "@/components/shared/coming-soon";
import { Inbox } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={Inbox}
      title="New Enquiry"
      description="Log a new enquiry and track it through to a quote."
      phase="Phase 2"
    />
  );
}
