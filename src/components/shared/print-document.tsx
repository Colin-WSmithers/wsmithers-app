import Image from "next/image";
import { formatCurrencyGBP, formatDateUK } from "@/lib/utils";
import type { PrintCompany, PrintLine, PrintParty, PrintSite } from "@/lib/data/print-documents";
import { PrintButton } from "./print-button";

function addressLines(parts: Array<string | null | undefined>): string[] {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean);
}

/**
 * The customer-facing document. Laid out for A4 and styled so that
 * Cmd/Ctrl+P → "Save as PDF" produces a clean, branded quote or invoice —
 * no PDF library needed, and what you see on screen is exactly what prints.
 */
export function PrintDocument({
  docLabel,
  number,
  company,
  customer,
  site,
  lines,
  showUnitColumn,
  meta,
  totals,
  notes,
  terms,
  footerNote,
  backHref,
  statusNote,
  partyLabel = "Prepared for",
  siteLabel = "Site address",
}: {
  docLabel: string;
  number: string;
  company: PrintCompany | null;
  customer: PrintParty | null;
  site: PrintSite | null;
  lines: PrintLine[];
  showUnitColumn: boolean;
  meta: Array<{ label: string; value: string }>;
  totals: Array<{ label: string; value: string; emphasis?: boolean; muted?: boolean }>;
  notes?: string | null;
  terms?: string | null;
  footerNote?: string | null;
  backHref: string;
  statusNote?: string | null;
  partyLabel?: string;
  siteLabel?: string;
}) {
  const companyAddress = addressLines([
    company?.address_line1,
    company?.address_line2,
    company?.city,
    company?.postcode,
  ]);

  const customerAddress = addressLines([
    customer?.company_name,
    customer?.billing_address_line1,
    customer?.billing_address_line2,
    customer?.billing_city,
    customer?.billing_postcode,
  ]);

  const siteAddress = site
    ? addressLines([site.address_line1, site.address_line2, site.city, site.postcode])
    : [];

  return (
    <div className="print-page mx-auto w-full max-w-[210mm] bg-white text-ink-900">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <a href={backHref} className="text-sm font-medium text-ink-500 hover:text-ink-800">
          ← Back
        </a>
        <PrintButton />
      </div>

      {/* Everything on the letterhead comes from company settings; if that's
          never been filled in the document would go out with no address, VAT
          number or bank details and nobody would notice until a customer did. */}
      {!company || (!company.address_line1 && !company.vat_number && !company.payment_details) ? (
        <div className="no-print mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Your company details are missing.</strong> This document
          will print without an address, VAT number or bank details. Add them in{" "}
          <a href="/settings" className="underline">
            company settings
          </a>{" "}
          before sending it.
        </div>
      ) : null}

      <div className="rounded-card border border-ink-200/80 p-8 shadow-subtle print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Masthead */}
        <div className="flex items-start justify-between gap-8 border-b border-ink-200 pb-6">
          <div>
            <Image
              src="/logo.png"
              alt={company?.company_name ?? "W. Smithers & Sons"}
              width={751}
              height={449}
              className="mb-3 h-20 w-auto object-contain object-left"
            />
            <div className="text-xs leading-relaxed text-ink-500">
              {companyAddress.map((l) => (
                <div key={l}>{l}</div>
              ))}
              {company?.phone ? <div>{company.phone}</div> : null}
              {company?.email ? <div>{company.email}</div> : null}
            </div>
          </div>

          <div className="text-right">
            <p className="font-display text-2xl font-semibold uppercase tracking-[0.12em] text-brand-600">
              {docLabel}
            </p>
            <p className="tnum mt-1 font-display text-lg font-semibold text-ink-900">{number}</p>
            <dl className="mt-3 space-y-0.5 text-xs text-ink-500">
              {meta.map((m) => (
                <div key={m.label} className="flex justify-end gap-2">
                  <dt>{m.label}</dt>
                  <dd className="tnum font-medium text-ink-800">{m.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-8 py-6">
          <div>
            <p className="eyebrow mb-1.5">{partyLabel}</p>
            <p className="font-display text-sm font-semibold text-ink-900">
              {customer?.display_name ?? "—"}
            </p>
            <div className="mt-0.5 text-xs leading-relaxed text-ink-600">
              {customerAddress.map((l) => (
                <div key={l}>{l}</div>
              ))}
              {customer?.email ? <div>{customer.email}</div> : null}
              {customer?.phone ? <div>{customer.phone}</div> : null}
            </div>
          </div>

          {site ? (
            <div>
              <p className="eyebrow mb-1.5">{siteLabel}</p>
              <p className="font-display text-sm font-semibold text-ink-900">{site.label}</p>
              <div className="mt-0.5 text-xs leading-relaxed text-ink-600">
                {siteAddress.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {statusNote ? (
          <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">{statusNote}</p>
        ) : null}

        {/* Lines */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-ink-200 bg-ink-50/60 print:bg-transparent">
              <th className="py-2 pr-3 text-left font-display text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-500">
                Description
              </th>
              <th className="w-20 py-2 px-2 text-right font-display text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-500">
                Qty
              </th>
              {showUnitColumn ? (
                <th className="w-20 py-2 px-2 text-left font-display text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Unit
                </th>
              ) : null}
              <th className="w-28 py-2 px-2 text-right font-display text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-500">
                Unit price
              </th>
              <th className="w-16 py-2 px-2 text-right font-display text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-500">
                VAT
              </th>
              <th className="w-28 py-2 pl-2 text-right font-display text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-500">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="break-inside-avoid border-b border-ink-100">
                <td className="py-2.5 pr-3 align-top text-ink-800">{line.description}</td>
                <td className="tnum py-2.5 px-2 text-right align-top text-ink-700">{Number(line.quantity)}</td>
                {showUnitColumn ? (
                  <td className="py-2.5 px-2 align-top text-ink-600">{line.unit ?? "item"}</td>
                ) : null}
                <td className="tnum py-2.5 px-2 text-right align-top text-ink-700">
                  {formatCurrencyGBP(Number(line.unit_price))}
                </td>
                <td className="tnum py-2.5 px-2 text-right align-top text-ink-600">{Number(line.vat_rate)}%</td>
                <td className="tnum py-2.5 pl-2 text-right align-top font-medium text-ink-900">
                  {formatCurrencyGBP(Number(line.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-5 flex justify-end break-inside-avoid">
          <dl className="w-64 space-y-1.5 text-sm">
            {totals.map((t) => (
              <div
                key={t.label}
                className={
                  t.emphasis
                    ? "flex justify-between border-t-2 border-ink-900 pt-2 font-display text-base font-semibold text-ink-900"
                    : `flex justify-between ${t.muted ? "text-ink-500" : "text-ink-700"}`
                }
              >
                <dt>{t.label}</dt>
                <dd className="tnum">{t.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Notes / terms / payment */}
        <div className="mt-8 space-y-4 break-inside-avoid border-t border-ink-200 pt-5 text-xs leading-relaxed text-ink-600">
          {notes ? (
            <div>
              <p className="eyebrow mb-1">Notes</p>
              <p className="whitespace-pre-line">{notes}</p>
            </div>
          ) : null}
          {terms ? (
            <div>
              <p className="eyebrow mb-1">Terms</p>
              <p className="whitespace-pre-line">{terms}</p>
            </div>
          ) : null}
          {company?.payment_details ? (
            <div>
              <p className="eyebrow mb-1">Payment details</p>
              <p className="whitespace-pre-line">{company.payment_details}</p>
            </div>
          ) : null}
          {footerNote ? <p className="text-ink-500">{footerNote}</p> : null}
        </div>

        {/* Statutory footer */}
        <div className="mt-6 flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-ink-200 pt-3 text-[10px] text-ink-400">
          <span>{company?.company_name ?? "W Smithers and Sons"}</span>
          {company?.company_number ? <span>Company no. {company.company_number}</span> : null}
          {company?.vat_number ? <span>VAT no. {company.vat_number}</span> : null}
        </div>
      </div>
    </div>
  );
}

export { formatDateUK };
