"use client";

import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { convertEnquiryToCustomerFormAction } from "../actions";

export function ConvertToCustomerButton({ enquiryId }: { enquiryId: string }) {
  const boundAction = convertEnquiryToCustomerFormAction.bind(null, enquiryId);

  return (
    <form action={boundAction}>
      <Button type="submit" size="sm" variant="outline">
        <UserPlus className="h-3.5 w-3.5" /> Convert to Customer
      </Button>
    </form>
  );
}
