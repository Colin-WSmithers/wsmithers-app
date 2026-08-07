import { z } from "zod";

export const PHOTO_CATEGORIES = ["before", "during", "after", "issue", "evidence", "other"] as const;

export const DOCUMENT_CATEGORIES = [
  "plans",
  "drawings",
  "contracts",
  "certificates",
  "supplier_quotes",
  "customer_documents",
  "risk_assessments",
  "method_statements",
  "receipts",
  "other",
] as const;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

export const jobPhotoMetaSchema = z.object({
  job_id: z.string().uuid(),
  category: z.enum(PHOTO_CATEGORIES),
  description: z.string().optional().or(z.literal("")),
});

export const documentMetaSchema = z.object({
  job_id: z.string().uuid().optional().or(z.literal("")),
  customer_id: z.string().uuid().optional().or(z.literal("")),
  category: z.enum(DOCUMENT_CATEGORIES),
  description: z.string().optional().or(z.literal("")),
});
