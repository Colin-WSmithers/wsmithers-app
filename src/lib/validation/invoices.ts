import { z } from "zod";

export const INVOICE_KINDS = ["deposit", "progress", "final", "standard"] as const;
export const INVOICE_STATUSES = ["draft", "sent", "viewed", "part_paid", "paid", "overdue", "void"] as const;
export const PAYMENT_METHODS = ["bank_transfer", "card", "cash", "cheque", "other"] as const;

export const invoiceSchema = z.object({
  customer_id: z.string().uuid("Choose a customer"),
  job_id: z.string().uuid().optional().or(z.literal("")),
  site_id: z.string().uuid().optional().or(z.literal("")),
  kind: z.enum(INVOICE_KINDS),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional().or(z.literal("")),
  terms: z.string().optional().or(z.literal("")),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const invoiceStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(INVOICE_STATUSES),
});

export const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.coerce.number().min(0.01, "Enter an amount"),
  paid_date: z.string().min(1, "Date is required"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
