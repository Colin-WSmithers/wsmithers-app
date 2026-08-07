"use client";

import { useActionState, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { LineItemsEditor } from "@/components/shared/line-items-editor";
import { createInvoiceAction, type FormState } from "./actions";
import { INVOICE_KINDS } from "@/lib/validation/invoices";

const initialState: FormState = {};

interface CustomerOption {
  id: string;
  display_name: string;
}
interface JobOption {
  id: string;
  job_number: string;
  job_name: string;
  customer_id: string;
  site_id: string | null;
}

export function InvoiceForm({
  customers,
  jobs,
  defaultJobId,
}: {
  customers: CustomerOption[];
  jobs: JobOption[];
  defaultJobId?: string;
}) {
  const [state, formAction, pending] = useActionState(createInvoiceAction, initialState);
  const defaultJob = jobs.find((j) => j.id === defaultJobId);
  const [jobId, setJobId] = useState(defaultJobId ?? "");
  const [customerId, setCustomerId] = useState(defaultJob?.customer_id ?? "");

  const selectedJob = useMemo(() => jobs.find((j) => j.id === jobId), [jobs, jobId]);

  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, []);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job_id">Job (optional)</Label>
            <Select
              name="job_id"
              defaultValue={defaultJobId}
              onValueChange={(value) => {
                setJobId(value);
                const job = jobs.find((j) => j.id === value);
                if (job) setCustomerId(job.customer_id);
              }}
            >
              <SelectTrigger id="job_id"><SelectValue placeholder="Not tied to a job" /></SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.job_number} — {j.job_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedJob?.site_id && <input type="hidden" name="site_id" value={selectedJob.site_id} />}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer_id">Customer</Label>
            <Select name="customer_id" value={customerId} onValueChange={setCustomerId} required>
              <SelectTrigger id="customer_id"><SelectValue placeholder="Choose a customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kind">Type</Label>
            <Select name="kind" defaultValue="standard">
              <SelectTrigger id="kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVOICE_KINDS.map((k) => (
                  <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="due_date">Due date</Label>
            <Input id="due_date" name="due_date" type="date" defaultValue={defaultDueDate} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="terms">Terms (optional — defaults to company terms if left blank)</Label>
            <Textarea id="terms" name="terms" rows={2} className="mt-1.5" />
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
          {pending ? "Creating…" : "Create invoice"}
        </Button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
