import "server-only";

/**
 * Line-item rows are submitted as parallel same-named fields (one value per
 * row, in DOM order) — e.g. every row's description input is named
 * "line_description". This zips those parallel arrays back into row
 * objects and drops any row with a blank description (an empty trailing
 * row left by the UI, or a row the user cleared).
 */
export function parseLineItemRows(
  formData: FormData,
  fields: { description: string; quantity: string; unitPrice: string; vatRate: string; unit?: string; category?: string }
): Array<{
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  unit: string | null;
  category: string | null;
  line_total: number;
}> {
  const descriptions = formData.getAll(fields.description).map(String);
  const quantities = formData.getAll(fields.quantity).map(String);
  const unitPrices = formData.getAll(fields.unitPrice).map(String);
  const vatRates = formData.getAll(fields.vatRate).map(String);
  const units = fields.unit ? formData.getAll(fields.unit).map(String) : [];
  const categories = fields.category ? formData.getAll(fields.category).map(String) : [];

  const rows: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    unit: string | null;
    category: string | null;
    line_total: number;
  }> = [];

  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i]?.trim();
    if (!description) continue;
    const quantity = Number(quantities[i]) || 0;
    const unit_price = Number(unitPrices[i]) || 0;
    const vat_rate = Number(vatRates[i]) || 0;
    rows.push({
      description,
      quantity,
      unit_price,
      vat_rate,
      unit: units[i]?.trim() || null,
      category: categories[i]?.trim() || null,
      line_total: Math.round(quantity * unit_price * 100) / 100,
    });
  }

  return rows;
}

export function sumLineItems(rows: Array<{ line_total: number; vat_rate: number }>) {
  const subtotal = Math.round(rows.reduce((sum, r) => sum + r.line_total, 0) * 100) / 100;
  const vat_total = Math.round(rows.reduce((sum, r) => sum + (r.line_total * r.vat_rate) / 100, 0) * 100) / 100;
  const grand_total = Math.round((subtotal + vat_total) * 100) / 100;
  return { subtotal, vat_total, grand_total };
}
