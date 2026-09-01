// Centralized timestamp handling for the whole app.
//
// Standard format everywhere (display AND what gets written to Google Sheets):
//   MM/DD/YYYY HH:MM:SS   (24-hour, always zero-padded, always includes seconds)
//   e.g. 10/03/2025 11:36:09
//
// Always computed in IST (Asia/Kolkata), regardless of the machine's local timezone,
// so the same instant always renders the same way for everyone.

const IST_TIME_ZONE = "Asia/Kolkata";
const SHEETS_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

// Accepts a Date, an ISO string, an already-formatted string, or a Google Sheets
// serial-date number, and returns a Date object (or null if it can't be parsed).
function toDate(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && isFinite(value)) {
    return new Date(SHEETS_EPOCH_UTC_MS + value * 86400000);
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getISTParts(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = {};
  formatter.formatToParts(date).forEach(({ type, value }) => {
    parts[type] = value;
  });
  // hour12:false can return "24" for midnight in some engines — normalize it.
  if (parts.hour === "24") parts.hour = "00";
  return parts;
}

/** Format any date-ish value as "MM/DD/YYYY HH:MM:SS" in IST. Non-parseable
 *  input passes through unchanged (matches how sheet cells sometimes hold
 *  already-formatted strings) so callers never crash or lose data. */
export function formatTimestamp(value) {
  const date = toDate(value);
  if (!date) return typeof value === "string" ? value : "";
  const { month, day, year, hour, minute, second } = getISTParts(date);
  return `${month}/${day}/${year} ${hour}:${minute}:${second}`;
}

/** The current moment, formatted as "MM/DD/YYYY HH:MM:SS" in IST. */
export function getCurrentTimestamp() {
  return formatTimestamp(new Date());
}

/** Format any date-ish value as "MM/DD/YYYY" only (no time), in IST. For
 *  fields that are genuinely date-only (e.g. a user-picked calendar date)
 *  rather than a generated timestamp. */
export function formatDateOnly(value) {
  const date = toDate(value);
  if (!date) return typeof value === "string" ? value : "";
  const { month, day, year } = getISTParts(date);
  return `${month}/${day}/${year}`;
}

/** For the "resend an entire existing sheet row unchanged" pattern: several
 *  pages walk every cell of a row before re-POSTing it, so date cells survive
 *  as real datetimes instead of decaying into text. That loop touches cells
 *  of every kind — Qty numbers, firm names, etc. — not just dates, so unlike
 *  formatTimestamp() this must NOT try to parse everything as a date (a plain
 *  number like a Qty would otherwise get misread as a Google Sheets serial
 *  date and corrupted). It only reformats values that already look like a
 *  date (a real Date object, or a string shaped like an ISO/`YYYY-MM-DD`
 *  timestamp); everything else — including null/undefined, which several
 *  callers rely on to signal "leave this formula cell alone" — passes through
 *  completely untouched. */
export function reformatIfDate(value) {
  if (value === null || value === undefined) return value;
  if (value === "") return "";
  if (value instanceof Date) return formatTimestamp(value);
  if (typeof value === "string" && (value.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(value))) {
    const date = toDate(value);
    return date ? formatTimestamp(date) : value;
  }
  return value;
}
