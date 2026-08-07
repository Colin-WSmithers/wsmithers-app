import { z } from "zod";

export const customerSchema = z.object({
  display_name: z.string().min(1, "Name is required"),
  company_name: z.string().optional().or(z.literal("")),
  first_name: z.string().optional().or(z.literal("")),
  last_name: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  billing_address_line1: z.string().optional().or(z.literal("")),
  billing_address_line2: z.string().optional().or(z.literal("")),
  billing_city: z.string().optional().or(z.literal("")),
  billing_postcode: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const siteSchema = z.object({
  customer_id: z.string().uuid(),
  label: z.string().min(1, "Give this site a short label, e.g. 'Home' or an address"),
  address_line1: z.string().min(1, "Address is required"),
  address_line2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postcode: z.string().min(1, "Postcode is required"),
  access_notes: z.string().optional().or(z.literal("")),
});

export type SiteInput = z.infer<typeof siteSchema>;

export const contactSchema = z.object({
  customer_id: z.string().uuid(),
  full_name: z.string().min(1, "Name is required"),
  role: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  is_primary: z.coerce.boolean().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
