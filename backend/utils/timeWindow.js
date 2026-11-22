// Small helper for the several "only allowed between X and Y IST" rules
// used across the app (audio tweets, payments, mobile login).
// India does not observe DST, so a fixed +5:30 offset from UTC is always correct.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Set DEMO_MODE=true in .env to switch off the time-of-day restrictions
// (audio tweets, payments, mobile login) so reviewers can try every feature
// at any hour.
export const DEMO_MODE = String(process.env.DEMO_MODE).toLowerCase() === "true";

/**
 * Returns the current time's hour/minute *as seen in IST*, regardless of
 * what timezone the server itself is running in.
 */
export function getISTParts(date = new Date()) {
  const istMs = date.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  return {
    hour: ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
    date: ist, // a Date whose UTC getters read like IST getters
  };
}

/**
 * Whether "now" (or the given date) falls within [startHour:startMinute, endHour:endMinute) IST.
 */
export function isWithinISTWindow(startHour, startMinute, endHour, endMinute, date = new Date()) {
  if (DEMO_MODE) return true;
  const { hour, minute } = getISTParts(date);
  const nowMins = hour * 60 + minute;
  const startMins = startHour * 60 + startMinute;
  const endMins = endHour * 60 + endMinute;
  return nowMins >= startMins && nowMins < endMins;
}

/** A stable "YYYY-M-D" key for the IST calendar day of the given date — used for "once per day" checks. */
export function istDateKey(date = new Date()) {
  const { date: ist } = getISTParts(date);
  return `${ist.getUTCFullYear()}-${ist.getUTCMonth()}-${ist.getUTCDate()}`;
}

/** A stable "YYYY-M" key for the IST calendar month — used for monthly subscription cycles. */
export function istMonthKey(date = new Date()) {
  const { date: ist } = getISTParts(date);
  return `${ist.getUTCFullYear()}-${ist.getUTCMonth() + 1}`;
}
