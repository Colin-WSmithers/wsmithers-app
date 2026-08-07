import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contact_name: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  account_number: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
