/**
 * Timezone-safe calendar-date utilities. All dates are ISO "YYYY-MM-DD" strings
 * interpreted as UTC midnight, so day-count math is stable in every timezone.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

/** Parse an ISO calendar date to UTC-midnight epoch ms. Throws on bad input. */
export function parseIsoDate(iso: string): number {
  if (!ISO_DATE.test(iso)) {
    throw new RangeError(`Expected ISO date "YYYY-MM-DD", received "${iso}"`);
  }
  const ms = Date.parse(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(ms)) {
    throw new RangeError(`Invalid calendar date: "${iso}"`);
  }
  // Date.parse leniently rolls over invalid days (e.g. "2026-02-30" -> Mar 2).
  // Reject anything that doesn't round-trip to the exact input components.
  if (toIsoDate(ms) !== iso) {
    throw new RangeError(`Invalid calendar date: "${iso}"`);
  }
  return ms;
}

/** Format UTC-midnight epoch ms back to "YYYY-MM-DD". */
export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole-day difference (b - a), truncated toward zero at day granularity. */
export function daysBetween(aIso: string, bIso: string): number {
  return Math.round((parseIsoDate(bIso) - parseIsoDate(aIso)) / MS_PER_DAY);
}

/** Add N calendar days to an ISO date. */
export function addDays(iso: string, days: number): string {
  return toIsoDate(parseIsoDate(iso) + days * MS_PER_DAY);
}

/**
 * Add N calendar months to an ISO date, clamping overflow (Jan 31 + 1mo -> Feb 28/29).
 * Uses UTC components so it never drifts across DST or timezone.
 */
export function addMonths(iso: string, months: number): string {
  const d = new Date(parseIsoDate(iso));
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + months;
  const day = d.getUTCDate();

  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const daysInTarget = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTarget);

  return toIsoDate(Date.UTC(targetYear, targetMonth, clampedDay));
}
