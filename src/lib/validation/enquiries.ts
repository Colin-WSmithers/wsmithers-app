import { z } from "zod";

export const ENQUIRY_STATUSES = [
  "new",
  "contacted",
  "site_visit_required",
  "quote_required",
  "quote_sent",
  "won",
  "lost",
] as const;

export const ENQUIRY_SOURCES = [
  "Website",
  "Referral",
  "Phone",
  "Repeat customer",
  "Social media",
  "Other",
] as const;

export const enquirySchema = z.object({
  customer_id: z.string().uuid().optional().or(z.literal("")),
  first_name: z.string().optional().or(z.literal("")),
  last_name: z.string().optional().or(z.literal("")),
  company_name: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  site_address: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  estimated_value: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  date_received: z.string().min(1, "Date received is required"),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  next_action_date: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(ENQUIRY_STATUSES),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const enquiryStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ENQUIRY_STATUSES),
});
