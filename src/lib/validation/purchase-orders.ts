import { z } from "zod";

export const PO_STATUSES = [
  "draft",
  "awaiting_approval",
  "approved",
  "sent",
  "partially_received",
  "received",
  "cancelled",
] as const;

export const purchaseOrderSchema = z.object({
  supplier_id: z.string().uuid("Choose a supplier"),
  job_id: z.string().uuid().optional().or(z.literal("")),
  expected_delivery_date: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export const poStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(PO_STATUSES),
});
