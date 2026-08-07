"use client";

import { useActionState, useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveTimesheetAction, type FormState } from "./actions";

const initialState: FormState = {};

export function ApproveButton({ timesheetId }: { timesheetId: string }) {
  const [state, formAction, pending] = useActionState(approveTimesheetAction, initialState);

  useEffect(() => {
    if (state.error) alert(state.error);
  }, [state.error]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={timesheetId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <Check className="h-3.5 w-3.5" /> {pending ? "Approving…" : "Approve"}
      </Button>
    </form>
  );
}
