import { ComingSoon } from "@/components/shared/coming-soon";
import { ShoppingCart } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={ShoppingCart}
      title="Purchase Orders"
      description="Raise POs against suppliers and jobs, with costs flowing straight into job costing."
      phase="Phase 6 — Commercial"
    />
  );
}
