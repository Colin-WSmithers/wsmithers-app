"use client";

import { useActionState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addJobNoteAction, type FormState } from "./actions";

const initialState: FormState = {};

export function NoteForm({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState(addJobNoteAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      formRef.current?.reset();
    }
    prevPending.current = pending;
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="job_id" value={jobId} />
      <Textarea name="body" rows={2} placeholder="Add an update for the office and crew…" required />
      <div className="flex items-center justify-between">
        {state.error ? <span className="text-xs text-red-600">{state.error}</span> : <span />}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post note"}
        </Button>
      </div>
    </form>
  );
}
