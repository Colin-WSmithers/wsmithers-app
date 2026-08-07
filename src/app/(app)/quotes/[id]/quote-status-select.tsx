"use client";

import { useActionState, useEffect, useRef } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { QUOTE_STATUSES } from "@/lib/validation/quotes";
import { updateQuoteStatusAction, type FormState } from "../actions";
import type { QuoteStatus } from "@/lib/supabase/types";

const initialState: FormState = {};
const SELECTABLE = QUOTE_STATUSES.filter((s) => s !== "accepted");

export function QuoteStatusSelect({ quoteId, currentStatus }: { quoteId: string; currentStatus: QuoteStatus }) {
  const [state, formAction] = useActionState(updateQuoteStatusAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) alert(state.error);
  }, [state.error]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="id" value={quoteId} />
      <Select name="status" defaultValue={currentStatus} onValueChange={() => formRef.current?.requestSubmit()}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SELECTABLE.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
