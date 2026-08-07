"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { addSiteAction, type FormState } from "../actions";

const initialState: FormState = {};

export function AddSiteDialog({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addSiteAction, initialState);

  useEffect(() => {
    // Successful submit (no error) closes the dialog — intentional sync with
    // the server action's completion.
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
          <Plus className="h-3.5 w-3.5" /> Add site
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a site</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="customer_id" value={customerId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" required placeholder="e.g. Home, or 12 High Street" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address_line1">Address line 1</Label>
            <Input id="address_line1" name="address_line1" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address_line2">Address line 2</Label>
            <Input id="address_line2" name="address_line2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="postcode">Postcode</Label>
              <Input id="postcode" name="postcode" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="access_notes">Access notes</Label>
            <Textarea id="access_notes" name="access_notes" rows={2} placeholder="Key safe code, parking, tenant details…" />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Adding…" : "Add site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
