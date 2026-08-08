"use client";

import { useActionState, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createJobAction, type FormState } from "./actions";
import { JOB_STATUSES } from "@/lib/validation/jobs";

const initialState: FormState = {};

interface CustomerOption {
  id: string;
  display_name: string;
}
interface SiteOption {
  id: string;
  customer_id: string;
  label: string;
  postcode: string;
}
interface StaffOption {
  id: string;
  full_name: string;
}

export function JobForm({
  customers,
  sites,
  staff,
  defaultCustomerId,
}: {
  customers: CustomerOption[];
  sites: SiteOption[];
  staff: StaffOption[];
  defaultCustomerId?: string;
}) {
  const [state, formAction, pending] = useActionState(createJobAction, initialState);
  // If a submit failed, restore what was typed instead of the customer picker
  // (and everything else) coming back blank.
  const restored = state.values;
  const restoredStaff = new Set(
    restored?.assigned_staff ? (Array.isArray(restored.assigned_staff) ? restored.assigned_staff : [restored.assigned_staff]) : []
  );
  const [customerId, setCustomerId] = useState(
    (restored?.customer_id as string | undefined) ?? defaultCustomerId ?? ""
  );

  const sitesForCustomer = useMemo(
    () => sites.filter((s) => s.customer_id === customerId),
    [sites, customerId]
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="job_name">Job name</Label>
            <Input
              id="job_name"
              name="job_name"
              required
              placeholder="e.g. Kitchen Renovation"
              className="mt-1.5"
              defaultValue={(restored?.job_name as string | undefined) ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer_id">Customer</Label>
            <Select name="customer_id" defaultValue={customerId || undefined} onValueChange={setCustomerId} required>
              <SelectTrigger id="customer_id"><SelectValue placeholder="Choose a customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site_id">Site</Label>
            <Select
              name="site_id"
              defaultValue={(restored?.site_id as string | undefined) || undefined}
              disabled={!customerId || sitesForCustomer.length === 0}
            >
              <SelectTrigger id="site_id">
                <SelectValue placeholder={customerId ? "Choose a site (optional)" : "Choose a customer first"} />
              </SelectTrigger>
              <SelectContent>
                {sitesForCustomer.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label} · {s.postcode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customerId && sitesForCustomer.length === 0 && (
              <p className="text-xs text-ink-500">This customer has no sites yet — add one from their customer page.</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1.5"
              defaultValue={(restored?.description as string | undefined) ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={(restored?.status as string | undefined) ?? "draft"}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start_date">Start date</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={(restored?.start_date as string | undefined) ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expected_completion_date">Expected completion</Label>
            <Input
              id="expected_completion_date"
              name="expected_completion_date"
              type="date"
              defaultValue={(restored?.expected_completion_date as string | undefined) ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="estimated_value">Estimated value (£)</Label>
            <Input
              id="estimated_value"
              name="estimated_value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={(restored?.estimated_value as string | undefined) ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="estimated_cost">Estimated cost (£)</Label>
            <Input
              id="estimated_cost"
              name="estimated_cost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={(restored?.estimated_cost as string | undefined) ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign the crew</CardTitle>
          <CardDescription>Anyone ticked here will see this job on their Today screen and Jobs list.</CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <p className="text-sm text-ink-500">No active staff to assign yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {staff.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    name="assigned_staff"
                    value={s.id}
                    defaultChecked={restoredStaff.has(s.id)}
                    className="h-4 w-4 rounded border-ink-300"
                  />
                  {s.full_name}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Creating…" : "Create job"}
        </Button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
