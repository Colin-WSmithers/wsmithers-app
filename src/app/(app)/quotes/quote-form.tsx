"use client";

import { useActionState, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { LineItemsEditor, type LineItemTemplate } from "@/components/shared/line-items-editor";
import { createQuoteAction, type FormState } from "./actions";

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

export function QuoteForm({
  customers,
  sites,
  templates,
  defaultCustomerId,
  defaultEnquiryId,
  defaultDescription,
}: {
  customers: CustomerOption[];
  sites: SiteOption[];
  templates: LineItemTemplate[];
  defaultCustomerId?: string;
  defaultEnquiryId?: string;
  defaultDescription?: string;
}) {
  const [state, formAction, pending] = useActionState(createQuoteAction, initialState);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");

  const sitesForCustomer = useMemo(() => sites.filter((s) => s.customer_id === customerId), [sites, customerId]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {defaultEnquiryId && <input type="hidden" name="enquiry_id" value={defaultEnquiryId} />}

      <Card>
        <CardHeader>
          <CardTitle>Quote details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer_id">Customer</Label>
            <Select name="customer_id" defaultValue={defaultCustomerId} onValueChange={setCustomerId} required>
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
            <Select name="site_id" disabled={!customerId || sitesForCustomer.length === 0}>
              <SelectTrigger id="site_id">
                <SelectValue placeholder={customerId ? "Choose a site (optional)" : "Choose a customer first"} />
              </SelectTrigger>
              <SelectContent>
                {sitesForCustomer.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label} · {s.postcode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={defaultDescription} className="mt-1.5" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiry_date">Expiry date</Label>
            <Input id="expiry_date" name="expiry_date" type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discount_amount">Discount (£)</Label>
            <Input id="discount_amount" name="discount_amount" type="number" step="0.01" min="0" defaultValue="0" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="terms">Terms (optional — defaults to company terms if left blank)</Label>
            <Textarea id="terms" name="terms" rows={2} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Internal notes (not shown to the customer)</Label>
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
              unit: "line_unit",
              category: "line_category",
            }}
            showCategory
            templates={templates}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Creating…" : "Create quote"}
        </Button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
