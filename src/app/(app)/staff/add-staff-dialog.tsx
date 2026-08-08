"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { CredentialReveal } from "@/components/shared/credential-reveal";
import { ROLES } from "@/lib/validation/staff";
import { createStaffAction, type FormState } from "./actions";

const initialState: FormState = {};

const ROLE_HINTS: Record<string, string> = {
  admin: "Full access, including staff and company settings.",
  office: "Everything except staff and settings — quotes, invoices, scheduling.",
  tradesperson: "Their own jobs, timesheets and photos. No financial data.",
  subcontractor: "Same as a tradesperson, for people outside the payroll.",
};

export function AddStaffDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("tradesperson");
  const [state, formAction, pending] = useActionState(createStaffAction, initialState);

  // Once a password has been issued the dialog switches to showing it, since
  // it's the only time it will ever be visible.
  const issued = Boolean(state.tempPassword);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reload so the new person shows in the table and the password is gone.
      if (issued) window.location.reload();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="primary">
          <UserPlus className="h-3.5 w-3.5" /> Add staff member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{issued ? "Login created" : "Add a staff member"}</DialogTitle>
        </DialogHeader>

        {issued ? (
          <div className="flex flex-col gap-4">
            <CredentialReveal email={state.tempPasswordFor ?? ""} password={state.tempPassword ?? ""} />
            <DialogFooter>
              <Button type="button" variant="primary" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" required placeholder="e.g. Dave Wilkins" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="dave@wsmithers.co.uk" />
              <p className="text-xs text-ink-400">This is what they&apos;ll sign in with.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Select name="role" value={role} onValueChange={setRole}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-ink-400">{ROLE_HINTS[role]}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job_title">Job title (optional)</Label>
                <Input id="job_title" name="job_title" placeholder="Carpenter" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" name="phone" placeholder="07700 900112" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hourly_rate">Hourly rate (optional)</Label>
              <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" min="0" placeholder="22.50" />
            </div>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Creating…" : "Create login"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
