"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createCustomerAction, type FormState } from "./actions";

const initialState: FormState = {};

export function CustomerForm() {
  const [state, formAction, pending] = useActionState(createCustomerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>The name shown throughout the app — a person&apos;s name or a company name.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Display name" name="display_name" required placeholder="e.g. James Wilson, or Oakfield Property Management" />
          </div>
          <Field label="Company name (optional)" name="company_name" />
          <Field label="First name" name="first_name" />
          <Field label="Last name" name="last_name" />
          <Field label="Email" name="email" type="email" />
          <Field label="Phone" name="phone" type="tel" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Address line 1" name="billing_address_line1" />
          <Field label="Address line 2" name="billing_address_line2" />
          <Field label="City" name="billing_city" />
          <Field label="Postcode" name="billing_postcode" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={3} placeholder="Anything the office or crew should know about this customer" />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Creating…" : "Create customer"}
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
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} />
    </div>
  );
}
