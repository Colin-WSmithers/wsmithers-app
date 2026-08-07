"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteAppointmentAction } from "./actions";

export function DeleteAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Remove appointment"
      onClick={() => {
        if (confirm("Remove this appointment?")) {
          startTransition(() => deleteAppointmentAction(appointmentId));
        }
      }}
      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
