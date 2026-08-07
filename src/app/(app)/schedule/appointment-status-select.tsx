"use client";

import { useActionState, useEffect, useRef } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { APPOINTMENT_STATUSES } from "@/lib/validation/appointments";
import { updateAppointmentStatusAction, type FormState } from "./actions";
import type { AppointmentStatus } from "@/lib/supabase/types";

const initialState: FormState = {};

export function AppointmentStatusSelect({ appointmentId, currentStatus }: { appointmentId: string; currentStatus: AppointmentStatus }) {
  const [state, formAction] = useActionState(updateAppointmentStatusAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) alert(state.error);
  }, [state.error]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="id" value={appointmentId} />
      <Select name="status" defaultValue={currentStatus} onValueChange={() => formRef.current?.requestSubmit()}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {APPOINTMENT_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
