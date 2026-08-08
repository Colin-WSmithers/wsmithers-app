"use client";

import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { CredentialReveal } from "@/components/shared/credential-reveal";
import { resetStaffPasswordAction, type FormState } from "./actions";

const initialState: FormState = {};

export function ResetPasswordDialog({ staffId, name }: { staffId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(resetStaffPasswordAction, initialState);
  const issued = Boolean(state.tempPassword);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`Reset password for ${name}`}>
          <KeyRound className="h-3.5 w-3.5" /> Reset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{issued ? "New password issued" : `Reset password for ${name}`}</DialogTitle>
        </DialogHeader>

        {issued ? (
          <div className="flex flex-col gap-4">
            <CredentialReveal email={state.tempPasswordFor ?? ""} password={state.tempPassword ?? ""} />
            <DialogFooter>
              <Button type="button" variant="primary" onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={staffId} />
            <p className="text-sm leading-relaxed text-ink-600">
              This replaces {name}&apos;s password immediately — they&apos;ll be signed out of any new
              session and will need the new one to get back in. You&apos;ll see it once, here.
            </p>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Resetting…" : "Reset password"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
