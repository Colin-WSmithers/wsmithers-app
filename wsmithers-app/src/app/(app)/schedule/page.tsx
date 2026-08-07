import { ComingSoon } from "@/components/shared/coming-soon";
import { CalendarDays } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Schedule"
      description="Drag-and-drop calendar for planning staff and subcontractors across day, week and month views."
      phase="Phase 4 — Scheduling"
    />
  );
}
