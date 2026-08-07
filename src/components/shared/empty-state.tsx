import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="max-w-xs text-sm text-slate-500">{description}</p>
      {actionLabel && actionHref ? (
        <Button asChild size="sm" className="mt-2">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
