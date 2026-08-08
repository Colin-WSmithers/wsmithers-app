import "server-only";
import { z } from "zod";

export interface LineItemRow {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  unit: string | null;
  category: string | null;
  line_total: number;
}

/**
 * Line items are the one place client-supplied numbers reach money columns, so
 * they get the same Zod treatment as every other input. Previously these were
 * parsed with `Number(x) || 0`, which silently turned "twelve" into 0 and let
 * negative quantities through — a crafted POST could store a negative invoice
 * total, which the payment trigger would then mark 'paid' for a penny.
 */
const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Every line needs a description").max(500),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .positive("Quantity must be greater than zero")
    .max(100_000, "That quantity looks wrong"),
  unit_price: z
    .number({ invalid_type_error: "Unit price must be a number" })
    .min(0, "Unit price cannot be negative")
    .max(1_000_000, "That unit price looks wrong"),
  vat_rate: z
    .number({ invalid_type_error: "VAT rate must be a number" })
    .min(0, "VAT rate cannot be negative")
    .max(100, "VAT rate cannot be above 100%"),
});

function toNumber(raw: string | undefined): number {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return Number.NaN;
  return Number(trimmed);
}

/**
 * Line-item rows are submitted as parallel same-named fields (one value per
 * row, in DOM order) — e.g. every row's description input is named
 * "line_description". This zips those parallel arrays back into row objects
 * and drops any row with a blank description (an empty trailing row left by
 * the UI, or a row the user cleared).
 *
 * Returns `{ rows }` on success or `{ error }` describing the first bad row —
 * callers must surface the error rather than saving a half-valid document.
 */
export function parseLineItemRows(
  formData: FormData,
  fields: { description: string; quantity: string; unitPrice: string; vatRate: string; unit?: string; category?: string }
): { rows: LineItemRow[]; error?: string } {
  const descriptions = formData.getAll(fields.description).map(String);
  const quantities = formData.getAll(fields.quantity).map(String);
  const unitPrices = formData.getAll(fields.unitPrice).map(String);
  const vatRates = formData.getAll(fields.vatRate).map(String);
  const units = fields.unit ? formData.getAll(fields.unit).map(String) : [];
  const categories = fields.category ? formData.getAll(fields.category).map(String) : [];

  const rows: LineItemRow[] = [];

  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i]?.trim();
    if (!description) continue;

    const parsed = lineItemSchema.safeParse({
      description,
      quantity: toNumber(quantities[i]),
      unit_price: toNumber(unitPrices[i]),
      vat_rate: toNumber(vatRates[i]),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? "Check the line items and try again.";
      return { rows: [], error: `Line ${rows.length + 1} (“${description}”): ${issue}` };
    }

    const { quantity, unit_price, vat_rate } = parsed.data;
    rows.push({
      description: parsed.data.description,
      quantity,
      unit_price,
      vat_rate,
      unit: units[i]?.trim() || null,
      category: categories[i]?.trim() || null,
      line_total: Math.round(quantity * unit_price * 100) / 100,
    });
  }

  return { rows };
}

export function sumLineItems(rows: Array<{ line_total: number; vat_rate: number }>) {
  const subtotal = Math.round(rows.reduce((sum, r) => sum + r.line_total, 0) * 100) / 100;
  const vat_total = Math.round(rows.reduce((sum, r) => sum + (r.line_total * r.vat_rate) / 100, 0) * 100) / 100;
  const grand_total = Math.round((subtotal + vat_total) * 100) / 100;
  return { subtotal, vat_total, grand_total };
}
