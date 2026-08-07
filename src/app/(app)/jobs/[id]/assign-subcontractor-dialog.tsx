"use client";

import { useActionState, useEffect, useState } from "react";
import { HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { addJobSubcontractorAction, type FormState } from "../actions";

const initialState: FormState = {};

export function AssignSubcontractorDialog({
  jobId,
  subcontractors,
}: {
  jobId: string;
  subcontractors: { id: string; name: string; trade: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addJobSubcontractorAction, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  if (subcontractors.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <HardHat className="h-3.5 w-3.5" /> Assign subcontractor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a subcontractor</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="job_id" value={jobId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subcontractor_id">Subcontractor</Label>
            <Select name="subcontractor_id" required>
              <SelectTrigger id="subcontractor_id"><SelectValue placeholder="Choose someone" /></SelectTrigger>
              <SelectContent>
                {subcontractors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.trade ? ` — ${s.trade}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role_on_job">Role on this job (optional)</Label>
            <Input id="role_on_job" name="role_on_job" placeholder="e.g. Electrics first fix" />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
