import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { GenerateSummaryButton } from "@/components/shared/generate-summary-button";
import { formatDateTimeUK, formatDateUK } from "@/lib/utils";
import type { DailySummary } from "@/lib/supabase/types";

export function SummaryCard({
  title,
  summary,
  emptyDescription,
  canGenerate,
  className,
}: {
  title: string;
  summary: DailySummary | null;
  emptyDescription: string;
  canGenerate: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          </span>
          {title}
        </CardTitle>
        {canGenerate ? <GenerateSummaryButton label={summary ? "Refresh" : "Generate now"} /> : null}
      </CardHeader>
      <CardContent>
        {summary ? (
          <div className="flex flex-col gap-2">
            {/* The model writes flowing prose with paragraph breaks, so render
                those as real paragraphs rather than one wall of text. */}
            <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-ink-700">
              {summary.content
                .split(/\n{2,}/)
                .map((para) => para.trim())
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>
            <p className="text-xs text-ink-400">
              For {formatDateUK(summary.summary_date)} · written {formatDateTimeUK(summary.generated_at)}
            </p>
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="No summary yet" description={emptyDescription} />
        )}
      </CardContent>
    </Card>
  );
}
