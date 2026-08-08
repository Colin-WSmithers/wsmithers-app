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
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-ink-300/70 bg-ink-50/40 px-6 py-12 text-center">
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-500 shadow-subtle ring-1 ring-ink-200/70">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-display text-sm font-semibold tracking-tight text-ink-900">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      {actionLabel && actionHref ? (
        <Button asChild size="sm" variant="primary" className="mt-3">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
