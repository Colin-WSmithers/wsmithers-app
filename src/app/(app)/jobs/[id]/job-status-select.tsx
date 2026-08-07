"use client";

import { useActionState, useEffect, useRef } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { JOB_STATUSES } from "@/lib/validation/jobs";
import { updateJobStatusAction, type FormState } from "../actions";
import type { JobStatus } from "@/lib/supabase/types";

const initialState: FormState = {};

export function JobStatusSelect({ jobId, currentStatus }: { jobId: string; currentStatus: JobStatus }) {
  const [state, formAction] = useActionState(updateJobStatusAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) alert(state.error);
  }, [state.error]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="id" value={jobId} />
      <Select name="status" defaultValue={currentStatus} onValueChange={() => formRef.current?.requestSubmit()}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {JOB_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
