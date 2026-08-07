"use client";

import { useActionState, useEffect, useRef } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { updateInvoiceStatusAction, type FormState } from "../actions";
import type { InvoiceStatus } from "@/lib/supabase/types";

const initialState: FormState = {};
// Statuses an office user sets by hand — part_paid/paid are driven by payments,
// overdue is set automatically once a due date passes (see the cron route).
const MANUAL_STATUSES = ["draft", "sent", "viewed", "void"] as const;

export function InvoiceStatusSelect({ invoiceId, currentStatus }: { invoiceId: string; currentStatus: InvoiceStatus }) {
  const [state, formAction] = useActionState(updateInvoiceStatusAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const isManual = (MANUAL_STATUSES as readonly string[]).includes(currentStatus);

  useEffect(() => {
    if (state.error) alert(state.error);
  }, [state.error]);

  if (!isManual) {
    return null;
  }

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="id" value={invoiceId} />
      <Select name="status" defaultValue={currentStatus} onValueChange={() => formRef.current?.requestSubmit()}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MANUAL_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
