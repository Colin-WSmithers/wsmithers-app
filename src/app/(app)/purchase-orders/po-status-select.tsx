"use client";

import { useActionState, useEffect, useRef } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PO_STATUSES } from "@/lib/validation/purchase-orders";
import { updatePurchaseOrderStatusAction, type FormState } from "./actions";
import type { PoStatus } from "@/lib/supabase/types";

const initialState: FormState = {};

export function PoStatusSelect({ poId, currentStatus }: { poId: string; currentStatus: PoStatus }) {
  const [state, formAction] = useActionState(updatePurchaseOrderStatusAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) alert(state.error);
  }, [state.error]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="id" value={poId} />
      <Select name="status" defaultValue={currentStatus} onValueChange={() => formRef.current?.requestSubmit()}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PO_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
