"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Browser print dialog → "Save as PDF" gives a proper document without
 * shipping a PDF library, and guarantees the PDF matches what's on screen.
 */
export function PrintButton() {
  return (
    <Button type="button" variant="primary" size="sm" onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
    </Button>
  );
}
