"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { LineItemsEditor } from "@/components/shared/line-items-editor";
import { createPurchaseOrderAction, type FormState } from "./actions";
import { AddSupplierDialog } from "./add-supplier-dialog";

const initialState: FormState = {};

export function PoForm({
  suppliers,
  jobs,
}: {
  suppliers: { id: string; name: string }[];
  jobs: { id: string; job_number: string; job_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createPurchaseOrderAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase order details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="supplier_id">Supplier</Label>
              <AddSupplierDialog />
            </div>
            <Select name="supplier_id" required>
              <SelectTrigger id="supplier_id"><SelectValue placeholder="Choose a supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job_id">Job (optional)</Label>
            <Select name="job_id">
              <SelectTrigger id="job_id"><SelectValue placeholder="Not tied to a job" /></SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.job_number} — {j.job_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expected_delivery_date">Expected delivery</Label>
            <Input id="expected_delivery_date" name="expected_delivery_date" type="date" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} className="mt-1.5" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemsEditor
            fieldNames={{
              description: "line_description",
              quantity: "line_quantity",
              unitPrice: "line_unit_price",
              vatRate: "line_vat_rate",
            }}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Creating…" : "Create purchase order"}
        </Button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
