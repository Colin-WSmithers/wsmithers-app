import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Honest placeholder for sections not yet built (see phased implementation
 * plan). Deliberately not a fake interactive UI — it states plainly what
 * this section will do and which phase builds it, rather than showing
 * buttons/tables that don't actually work yet.
 */
export function ComingSoon({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Arrives in {phase}
        </span>
      </CardContent>
    </Card>
  );
}
