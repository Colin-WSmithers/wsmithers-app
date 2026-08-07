import { z } from "zod";

export const companySettingsSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")).nullable(),
  company_number: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
  default_vat_rate: z.coerce.number().min(0).max(100),
  quote_terms: z.string().optional().nullable(),
  invoice_terms: z.string().optional().nullable(),
  payment_details: z.string().optional().nullable(),
  job_number_prefix: z.string().min(1).max(10),
  quote_number_prefix: z.string().min(1).max(10),
  invoice_number_prefix: z.string().min(1).max(10),
  po_number_prefix: z.string().min(1).max(10),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
