import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            tone === "danger" && "bg-red-50 text-red-600",
            tone === "warning" && "bg-amber-50 text-amber-600",
            tone === "default" && "bg-slate-100 text-slate-600"
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-xl font-semibold leading-tight text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
