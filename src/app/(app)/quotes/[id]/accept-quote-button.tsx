"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptQuoteFormAction } from "../actions";

export function AcceptQuoteButton({ quoteId }: { quoteId: string }) {
  const boundAction = acceptQuoteFormAction.bind(null, quoteId);

  return (
    <form
      action={boundAction}
      onSubmit={(e) => {
        if (!confirm("Accept this quote? This will create a job automatically.")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" size="sm" variant="primary">
        <CheckCircle2 className="h-3.5 w-3.5" /> Accept &amp; create job
      </Button>
    </form>
  );
}
