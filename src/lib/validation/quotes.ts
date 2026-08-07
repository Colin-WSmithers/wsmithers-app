import { z } from "zod";

export const QUOTE_STATUSES = ["draft", "sent", "viewed", "accepted", "rejected", "expired"] as const;

export const quoteSchema = z.object({
  customer_id: z.string().uuid("Choose a customer"),
  site_id: z.string().uuid().optional().or(z.literal("")),
  enquiry_id: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  terms: z.string().optional().or(z.literal("")),
  expiry_date: z.string().optional().or(z.literal("")),
  discount_amount: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? 0 : v)),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

export const quoteStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(QUOTE_STATUSES),
});
