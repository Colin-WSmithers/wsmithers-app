"use client";

import { useActionState, useEffect, useRef } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ENQUIRY_STATUSES } from "@/lib/validation/enquiries";
import { updateEnquiryStatusAction, type FormState } from "../actions";
import type { EnquiryStatus } from "@/lib/supabase/types";

const initialState: FormState = {};

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function StatusSelect({ enquiryId, currentStatus }: { enquiryId: string; currentStatus: EnquiryStatus }) {
  const [state, formAction] = useActionState(updateEnquiryStatusAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) alert(state.error);
  }, [state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={enquiryId} />
      <Select name="status" defaultValue={currentStatus} onValueChange={() => formRef.current?.requestSubmit()}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ENQUIRY_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {statusLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
