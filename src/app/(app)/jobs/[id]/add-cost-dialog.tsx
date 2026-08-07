"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { addJobCostAction, type FormState } from "./actions";
import { JOB_COST_CATEGORIES } from "@/lib/validation/job-costs";

const initialState: FormState = {};

export function AddCostDialog({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addJobCostAction, initialState);

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
          <Plus className="h-3.5 w-3.5" /> Log a cost
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a cost</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="job_id" value={jobId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item">What was it?</Label>
            <Input id="item" name="item" required placeholder="e.g. Timber from Jewson" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue="material">
                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_COST_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incurred_date">Date</Label>
              <Input id="incurred_date" name="incurred_date" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" step="0.01" min="0.01" defaultValue="1" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit_cost">Unit cost (£)</Label>
              <Input id="unit_cost" name="unit_cost" type="number" step="0.01" min="0" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vat_rate">VAT %</Label>
              <Input id="vat_rate" name="vat_rate" type="number" step="0.01" min="0" max="100" defaultValue="20" />
            </div>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save cost"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
