"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createEnquiryAction, type FormState } from "./actions";
import { ENQUIRY_SOURCES } from "@/lib/validation/enquiries";

const initialState: FormState = {};
const todayISO = () => new Date().toISOString().slice(0, 10);

export function EnquiryForm({ staff }: { staff: { id: string; full_name: string }[] }) {
  const [state, formAction, pending] = useActionState(createEnquiryAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="status" value="new" />

      <Card>
        <CardHeader>
          <CardTitle>Who&apos;s asking</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" name="first_name" />
          <Field label="Last name" name="last_name" />
          <Field label="Company name (optional)" name="company_name" />
          <Field label="Email" name="email" type="email" />
          <Field label="Phone" name="phone" type="tel" />
          <Field label="Site address" name="site_address" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>The enquiry</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description of work</Label>
            <Textarea id="description" name="description" rows={3} className="mt-1.5" />
          </div>
          <Field label="Estimated value (£)" name="estimated_value" type="number" step="0.01" />
          <Field label="Date received" name="date_received" type="date" defaultValue={todayISO()} required />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source">Source</Label>
            <Select name="source">
              <SelectTrigger id="source"><SelectValue placeholder="How did they find us?" /></SelectTrigger>
              <SelectContent>
                {ENQUIRY_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assigned_to">Assigned to</Label>
            <Select name="assigned_to">
              <SelectTrigger id="assigned_to"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Next action date" name="next_action_date" type="date" />
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} className="mt-1.5" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Log enquiry"}
        </Button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} step={step} required={required} defaultValue={defaultValue} />
    </div>
  );
}
