"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { addManualTimesheetAction, type FormState } from "./actions";

const initialState: FormState = {};

export function ManualEntryDialog({ jobs }: { jobs: { id: string; job_number: string; job_name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addManualTimesheetAction, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Add entry manually
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a manual time entry</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual_job_id">Job</Label>
            <Select name="job_id" required>
              <SelectTrigger id="manual_job_id"><SelectValue placeholder="Choose a job" /></SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.job_number} — {j.job_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="started_at">Started</Label>
              <Input id="started_at" name="started_at" type="datetime-local" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ended_at">Ended</Label>
              <Input id="ended_at" name="ended_at" type="datetime-local" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="break_minutes_manual">Break (minutes)</Label>
            <Input id="break_minutes_manual" name="break_minutes" type="number" min="0" defaultValue="0" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
