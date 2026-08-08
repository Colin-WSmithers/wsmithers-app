"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyGBP } from "@/lib/utils";

export interface LineItemRow {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  vat_rate: string;
  category: string;
}

export interface LineItemTemplate {
  category: string;
  description: string;
  default_unit: string;
  default_unit_price: number;
  default_vat_rate: number;
}

function emptyRow(id: string, defaultVatRate: number): LineItemRow {
  return { id, description: "", quantity: "1", unit: "item", unit_price: "", vat_rate: String(defaultVatRate), category: "" };
}

export function LineItemsEditor({
  fieldNames,
  showUnit = true,
  showCategory = false,
  defaultVatRate = 20,
  templates = [],
}: {
  fieldNames: { description: string; quantity: string; unitPrice: string; vatRate: string; unit?: string; category?: string };
  showUnit?: boolean;
  showCategory?: boolean;
  defaultVatRate?: number;
  templates?: LineItemTemplate[];
}) {
  const baseId = useId();
  const [rows, setRows] = useState<LineItemRow[]>([emptyRow(`${baseId}-0`, defaultVatRate)]);

  const addRow = () => setRows((r) => [...r, emptyRow(`${baseId}-${r.length}-${Date.now()}`, defaultVatRate)]);
  const removeRow = (id: string) => setRows((r) => (r.length > 1 ? r.filter((row) => row.id !== id) : r));
  const updateRow = (id: string, patch: Partial<LineItemRow>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const applyTemplate = (id: string, templateDescription: string) => {
    const t = templates.find((tpl) => tpl.description === templateDescription);
    if (!t) return;
    updateRow(id, {
      description: t.description,
      category: t.category,
      unit: t.default_unit,
      unit_price: String(t.default_unit_price),
      vat_rate: String(t.default_vat_rate),
    });
  };

  const subtotal = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const vatTotal = rows.reduce(
    (sum, r) => sum + ((Number(r.quantity) || 0) * (Number(r.unit_price) || 0) * (Number(r.vat_rate) || 0)) / 100,
    0
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-2 rounded-md border border-ink-200 p-3 sm:flex-row sm:items-end sm:gap-2 sm:rounded-none sm:border-0 sm:border-b sm:p-0 sm:pb-2">
            {templates.length > 0 && (
              <div className="sm:w-40">
                <label className="text-xs text-ink-500">Template</label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-ink-200 bg-white px-2 text-sm"
                  defaultValue=""
                  onChange={(e) => applyTemplate(row.id, e.target.value)}
                >
                  <option value="">Custom…</option>
                  {templates.map((t) => (
                    <option key={t.description} value={t.description}>{t.description}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-1">
              <label className="text-xs text-ink-500">Description</label>
              <Input
                name={fieldNames.description}
                value={row.description}
                onChange={(e) => updateRow(row.id, { description: e.target.value })}
                placeholder="e.g. Supply and fit kitchen units"
                className="mt-1"
              />
            </div>
            {showCategory && (
              <div className="sm:w-28">
                <label className="text-xs text-ink-500">Category</label>
                <Input
                  name={fieldNames.category}
                  value={row.category}
                  onChange={(e) => updateRow(row.id, { category: e.target.value })}
                  placeholder="Labour"
                  className="mt-1"
                />
              </div>
            )}
            <div className="sm:w-20">
              <label className="text-xs text-ink-500">Qty</label>
              <Input
                name={fieldNames.quantity}
                type="number"
                step="0.01"
                value={row.quantity}
                onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                className="mt-1"
              />
            </div>
            {showUnit && (
              <div className="sm:w-20">
                <label className="text-xs text-ink-500">Unit</label>
                <Input
                  name={fieldNames.unit}
                  value={row.unit}
                  onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}
            <div className="sm:w-24">
              <label className="text-xs text-ink-500">Unit price (£)</label>
              <Input
                name={fieldNames.unitPrice}
                type="number"
                step="0.01"
                min="0"
                value={row.unit_price}
                onChange={(e) => updateRow(row.id, { unit_price: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="sm:w-20">
              <label className="text-xs text-ink-500">VAT %</label>
              <Input
                name={fieldNames.vatRate}
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={row.vat_rate}
                onChange={(e) => updateRow(row.id, { vat_rate: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.id)} aria-label="Remove line">
              <Trash2 className="h-4 w-4 text-ink-400" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-fit">
        <Plus className="h-3.5 w-3.5" /> Add line
      </Button>

      <div className="flex justify-end gap-6 border-t border-ink-100 pt-3 text-sm">
        <span className="text-ink-500">Subtotal: {formatCurrencyGBP(subtotal)}</span>
        <span className="text-ink-500">VAT: {formatCurrencyGBP(vatTotal)}</span>
        <span className="font-semibold text-ink-900">Total: {formatCurrencyGBP(subtotal + vatTotal)}</span>
      </div>
    </div>
  );
}
