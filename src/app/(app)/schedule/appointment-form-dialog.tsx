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
import { createAppointmentAction, type FormState } from "./actions";

const initialState: FormState = {};

interface JobOption {
  id: string;
  job_number: string;
  job_name: string;
}
interface StaffOption {
  id: string;
  full_name: string;
}
interface SubcontractorOption {
  id: string;
  name: string;
  trade: string | null;
}

export function AppointmentFormDialog({
  jobs,
  staff,
  subcontractors,
  defaultDate,
}: {
  jobs: JobOption[];
  staff: StaffOption[];
  subcontractors: SubcontractorOption[];
  defaultDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createAppointmentAction, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const defaultStart = defaultDate ? `${defaultDate}T09:00` : "";
  const defaultEnd = defaultDate ? `${defaultDate}T17:00` : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> New appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule an appointment</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job_id">Job</Label>
            <Select name="job_id" required>
              <SelectTrigger id="job_id"><SelectValue placeholder="Choose a job" /></SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.job_number} — {j.job_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title (optional)</Label>
            <Input id="title" name="title" placeholder="e.g. First fix" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="starts_at">Starts</Label>
              <Input id="starts_at" name="starts_at" type="datetime-local" defaultValue={defaultStart} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ends_at">Ends</Label>
              <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={defaultEnd} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Assign staff</Label>
            {staff.length === 0 ? (
              <p className="text-sm text-ink-500">No active staff to assign.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {staff.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-700">
                    <input type="checkbox" name="assigned_staff" value={s.id} className="h-4 w-4 rounded border-ink-300" />
                    {s.full_name}
                  </label>
                ))}
              </div>
            )}
          </div>
          {subcontractors.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Assign subcontractors</Label>
              <div className="grid grid-cols-2 gap-2">
                {subcontractors.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-700">
                    <input type="checkbox" name="assigned_subcontractors" value={s.id} className="h-4 w-4 rounded border-ink-300" />
                    {s.name}{s.trade ? ` — ${s.trade}` : ""}
                  </label>
                ))}
              </div>
            </div>
          )}
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
