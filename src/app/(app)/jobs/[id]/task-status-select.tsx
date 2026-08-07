"use client";

import { useActionState, useEffect, useRef } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TASK_STATUSES } from "@/lib/validation/job-tasks";
import { updateJobTaskStatusAction, type FormState } from "./actions";
import type { JobTaskStatus } from "@/lib/supabase/types";

const initialState: FormState = {};

export function TaskStatusSelect({
  taskId,
  jobId,
  currentStatus,
}: {
  taskId: string;
  jobId: string;
  currentStatus: JobTaskStatus;
}) {
  const [state, formAction] = useActionState(updateJobTaskStatusAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) alert(state.error);
  }, [state.error]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="id" value={taskId} />
      <input type="hidden" name="job_id" value={jobId} />
      <Select name="status" defaultValue={currentStatus} onValueChange={() => formRef.current?.requestSubmit()}>
        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
