import { ComingSoon } from "@/components/shared/coming-soon";
import { Users } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={Users}
      title="New Customer"
      description="Add a customer with billing details, contacts and sites."
      phase="Phase 2"
    />
  );
}
