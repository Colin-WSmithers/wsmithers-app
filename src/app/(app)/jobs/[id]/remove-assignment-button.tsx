"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { removeJobAssignmentAction } from "../actions";

export function RemoveAssignmentButton({ assignmentId, jobId }: { assignmentId: string; jobId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Remove from job"
      onClick={() => startTransition(() => removeJobAssignmentAction(assignmentId, jobId))}
      className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-red-600 disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
