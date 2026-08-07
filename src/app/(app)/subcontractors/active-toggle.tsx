"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { toggleSubcontractorActiveAction } from "./actions";

export function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleSubcontractorActiveAction(id, !isActive))}
      className="disabled:opacity-50"
      title={isActive ? "Click to deactivate" : "Click to reactivate"}
    >
      <Badge variant={isActive ? "success" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
    </button>
  );
}
