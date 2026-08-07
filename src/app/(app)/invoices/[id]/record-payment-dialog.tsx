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
import { recordPaymentAction, type FormState } from "../actions";
import { PAYMENT_METHODS } from "@/lib/validation/invoices";

const initialState: FormState = {};

export function RecordPaymentDialog({ invoiceId, outstanding }: { invoiceId: string; outstanding: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(recordPaymentAction, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="primary">
          <Plus className="h-3.5 w-3.5" /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount (£)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={outstanding > 0 ? outstanding.toFixed(2) : undefined} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paid_date">Date</Label>
              <Input id="paid_date" name="paid_date" type="date" defaultValue={today} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="method">Method</Label>
            <Select name="method" defaultValue="bank_transfer">
              <SelectTrigger id="method"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input id="reference" name="reference" placeholder="e.g. bank transaction ref" />
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
              {pending ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
