"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSummariesNowAction } from "@/app/(app)/actions";

/**
 * Writes today's summaries on demand instead of waiting for the evening cron —
 * useful for checking it works right after adding the API key, and for the
 * office wanting an up-to-date picture mid-afternoon.
 */
export function GenerateSummaryButton({ label = "Generate now" }: { label?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await generateSummariesNowAction();
            if (result?.error) setError(result.error);
          });
        }}
      >
        <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        {pending ? "Writing…" : label}
      </Button>
      {error ? <p className="max-w-xs text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
