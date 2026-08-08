import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Amounts are stored in the database as numeric(12,2) POUNDS (not pence).
 * Keep all money as plain decimal pounds end-to-end to avoid pence/pounds
 * conversion bugs; Postgres numeric(12,2) is exact, so this is safe.
 */
export function formatCurrencyGBP(amountPounds: number | null | undefined): string {
  const amount = amountPounds ?? 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export function formatDateUK(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "In progress";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatDateTimeUK(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ---------------------------------------------------------------------------
// PostgREST filter escaping
//
// A PostgREST `or=(...)` filter is a single comma-separated string, so a raw
// user search term containing a comma, parenthesis or double quote splits the
// expression and either 400s or silently matches the wrong thing — e.g.
// searching for `Barton & Sons, Ltd`. Values are therefore double-quoted for
// PostgREST, and LIKE metacharacters (% _ \) are escaped so they're treated as
// literal text rather than wildcards.
// ---------------------------------------------------------------------------

/** Escape LIKE/ILIKE metacharacters so the term matches literally. */
export function escapeLikeTerm(term: string): string {
  return term.replace(/([\\%_])/g, "\\$1");
}

/** Wrap a value for safe use inside a PostgREST filter expression. */
function postgrestQuote(value: string): string {
  return `"${value.replace(/(["\\])/g, "\\$1")}"`;
}

/**
 * Build a PostgREST `.or()` expression matching `term` against any of
 * `columns` case-insensitively. Safe for arbitrary user input.
 */
export function ilikeAnyFilter(columns: string[], term: string): string {
  const value = postgrestQuote(`%${escapeLikeTerm(term)}%`);
  return columns.map((column) => `${column}.ilike.${value}`).join(",");
}

/** The `%term%` pattern for a single-column `.ilike(col, pattern)` call. */
export function ilikePattern(term: string): string {
  return `%${escapeLikeTerm(term)}%`;
}

// ---------------------------------------------------------------------------
// Europe/London day boundaries
//
// The server (Vercel, Postgres) runs in UTC, but the business runs in UK local
// time — and the UK is on BST (UTC+1) for roughly seven months of the year.
// Deriving "today" from toISOString()/setHours() therefore puts the day
// boundary an hour late during BST: a timesheet clocked at 00:30 BST would be
// counted against the previous day, and 23:30 BST would be counted against the
// next one. These helpers pin day/week boundaries to actual London local time.
// ---------------------------------------------------------------------------

const LONDON_TZ = "Europe/London";

const LONDON_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TZ,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function londonFields(at: Date) {
  const parts: Record<string, string> = {};
  for (const p of LONDON_PARTS.formatToParts(at)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Intl renders midnight as "24" in some en-GB/hour12:false combinations.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** How far ahead of UTC London is at this instant, in milliseconds (0 or +1h). */
function londonOffsetMs(at: Date): number {
  const f = londonFields(at);
  const asIfUTC = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asIfUTC - (at.getTime() - at.getMilliseconds());
}

/** "YYYY-MM-DD" for the London calendar day containing `at`. */
export function londonDateKey(at: Date = new Date()): string {
  const f = londonFields(at);
  return `${f.year}-${String(f.month).padStart(2, "0")}-${String(f.day).padStart(2, "0")}`;
}

/** The UTC instant at which the given London calendar day begins. */
export function londonDayStart(dateKey: string): Date {
  const guess = new Date(`${dateKey}T00:00:00.000Z`);
  const offset = londonOffsetMs(guess);
  const corrected = new Date(guess.getTime() - offset);
  // Re-check once: on the two DST changeover days the first guess can land on
  // the wrong side of the transition.
  const settled = londonOffsetMs(corrected);
  return settled === offset ? corrected : new Date(guess.getTime() - settled);
}

/** Half-open [start, end) UTC range covering one London calendar day. */
export function londonDayRange(dateKey: string = londonDateKey()): { start: Date; end: Date } {
  const start = londonDayStart(dateKey);
  const [y, m, d] = dateKey.split("-").map(Number);
  const nextKey = londonDateKey(new Date(Date.UTC(y, m - 1, d + 1, 12)));
  return { start, end: londonDayStart(nextKey) };
}

/** Half-open [start, end) UTC range covering `days` London days from `dateKey`. */
export function londonDaySpan(dateKey: string, days: number): { start: Date; end: Date } {
  const start = londonDayStart(dateKey);
  const [y, m, d] = dateKey.split("-").map(Number);
  const endKey = londonDateKey(new Date(Date.UTC(y, m - 1, d + days, 12)));
  return { start, end: londonDayStart(endKey) };
}

/** London date key for the Monday of the week containing `at`. */
export function londonWeekStartKey(at: Date = new Date()): string {
  const key = londonDateKey(at);
  const [y, m, d] = key.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = noon.getUTCDay(); // 0 = Sunday
  const delta = dow === 0 ? -6 : 1 - dow;
  return londonDateKey(new Date(Date.UTC(y, m - 1, d + delta, 12)));
}

/** London date key for the first day of the month containing `at`. */
export function londonMonthStartKey(at: Date = new Date()): string {
  const f = londonFields(at);
  return `${f.year}-${String(f.month).padStart(2, "0")}-01`;
}
