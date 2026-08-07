"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CompanySettings } from "@/lib/supabase/types";
import { updateCompanySettingsAction, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

export function SettingsForm({ settings }: { settings: CompanySettings | null }) {
  const [state, formAction, pending] = useActionState(updateCompanySettingsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>Shown on quotes, invoices and purchase order PDFs.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company name" name="company_name" defaultValue={settings?.company_name} required />
          <Field label="Company number" name="company_number" defaultValue={settings?.company_number ?? ""} />
          <Field label="VAT number" name="vat_number" defaultValue={settings?.vat_number ?? ""} />
          <Field label="Default VAT rate (%)" name="default_vat_rate" type="number" step="0.01" defaultValue={settings?.default_vat_rate ?? 20} />
          <Field label="Address line 1" name="address_line1" defaultValue={settings?.address_line1 ?? ""} />
          <Field label="Address line 2" name="address_line2" defaultValue={settings?.address_line2 ?? ""} />
          <Field label="City" name="city" defaultValue={settings?.city ?? ""} />
          <Field label="Postcode" name="postcode" defaultValue={settings?.postcode ?? ""} />
          <Field label="Phone" name="phone" defaultValue={settings?.phone ?? ""} />
          <Field label="Email" name="email" type="email" defaultValue={settings?.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document numbering</CardTitle>
          <CardDescription>Prefixes used for new jobs, quotes, invoices and purchase orders.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Job prefix" name="job_number_prefix" defaultValue={settings?.job_number_prefix ?? "JOB"} />
          <Field label="Quote prefix" name="quote_number_prefix" defaultValue={settings?.quote_number_prefix ?? "Q"} />
          <Field label="Invoice prefix" name="invoice_number_prefix" defaultValue={settings?.invoice_number_prefix ?? "INV"} />
          <Field label="PO prefix" name="po_number_prefix" defaultValue={settings?.po_number_prefix ?? "PO"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terms & payment details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quote_terms">Quote terms</Label>
            <Textarea id="quote_terms" name="quote_terms" defaultValue={settings?.quote_terms ?? ""} rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice_terms">Invoice terms</Label>
            <Textarea id="invoice_terms" name="invoice_terms" defaultValue={settings?.invoice_terms ?? ""} rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment_details">Payment details</Label>
            <Textarea id="payment_details" name="payment_details" defaultValue={settings?.payment_details ?? ""} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {state.success && <span className="text-sm text-emerald-600">Saved.</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  step,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} step={step} defaultValue={defaultValue ?? ""} required={required} />
    </div>
  );
}
