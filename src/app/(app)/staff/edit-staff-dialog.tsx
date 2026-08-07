"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { updateStaffAction, type FormState } from "./actions";
import { ROLES } from "@/lib/validation/staff";
import type { Profile } from "@/lib/supabase/types";

const initialState: FormState = {};

export function EditStaffDialog({ staff, isSelf }: { staff: Profile; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateStaffAction, initialState);

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
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {staff.full_name}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={staff.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" defaultValue={staff.full_name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue={staff.role} disabled={isSelf}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSelf && <input type="hidden" name="role" value={staff.role} />}
              {isSelf && <p className="text-xs text-slate-400">You can&apos;t change your own role.</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job_title">Job title</Label>
              <Input id="job_title" name="job_title" defaultValue={staff.job_title ?? ""} placeholder="e.g. Site Foreman" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={staff.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hourly_rate">Hourly rate (£)</Label>
              <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" min="0" defaultValue={staff.hourly_rate ?? ""} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="is_active" defaultChecked={staff.is_active} className="h-4 w-4 rounded border-slate-300" />
            Active (assignable to jobs, appears in pickers)
          </label>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
