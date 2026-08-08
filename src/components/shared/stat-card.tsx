import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "brand";
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-card border border-ink-200/80 bg-white p-4 shadow-subtle transition-shadow hover:shadow-raised">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-400">
            {label}
          </p>
          <p className="tnum mt-1.5 font-display text-[1.375rem] font-semibold leading-tight tracking-tight text-ink-900">
            {value}
          </p>
          {hint ? <p className="mt-0.5 text-xs text-ink-400">{hint}</p> : null}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            tone === "danger" && "bg-red-50 text-red-600",
            tone === "warning" && "bg-amber-50 text-amber-600",
            tone === "brand" && "bg-brand-50 text-brand-600",
            tone === "default" && "bg-ink-100 text-ink-500 group-hover:bg-brand-50 group-hover:text-brand-600"
          )}
        >
          <Icon className="h-[1.125rem] w-[1.125rem]" />
        </div>
      </div>
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100",
          tone === "danger" ? "bg-red-500" : tone === "warning" ? "bg-amber-500" : "bg-brand-600"
        )}
      />
    </div>
  );
}
