/**
 * Money value object — stored as INTEGER CENTS to eliminate IEEE-754 float
 * drift (e.g. 0.1 + 0.2 !== 0.3). Decimals only ever appear at the display edge.
 */
export interface Money {
  /** Integer number of minor units (cents). May be negative (credits/refunds). */
  readonly cents: number;
  /** ISO 4217 currency code, e.g. "USD". */
  readonly currency: string;
}

const DEFAULT_CURRENCY = "USD";

function assertInteger(cents: number): void {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`Money.cents must be an integer, received ${cents}`);
  }
  if (!Number.isFinite(cents)) {
    throw new RangeError(`Money.cents must be finite, received ${cents}`);
  }
}

/** Build Money from a major-unit amount (e.g. 12.99 -> 1299 cents). */
export function money(major: number, currency: string = DEFAULT_CURRENCY): Money {
  if (!Number.isFinite(major)) {
    throw new RangeError(`money() amount must be finite, received ${major}`);
  }
  // Round to the nearest cent; scale before rounding to avoid float artifacts.
  const cents = Math.round((major + Number.EPSILON) * 100);
  return { cents, currency: normalizeCurrency(currency) };
}

/** Build Money directly from integer cents. */
export function fromCents(cents: number, currency: string = DEFAULT_CURRENCY): Money {
  assertInteger(cents);
  return { cents, currency: normalizeCurrency(currency) };
}

export const zero = (currency: string = DEFAULT_CURRENCY): Money =>
  fromCents(0, currency);

function normalizeCurrency(currency: string): string {
  const c = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) {
    throw new RangeError(`Invalid ISO 4217 currency code: "${currency}"`);
  }
  return c;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(
      `Cannot combine mismatched currencies: ${a.currency} vs ${b.currency}. ` +
        `Convert to a common currency first.`,
    );
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return fromCents(a.cents + b.cents, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return fromCents(a.cents - b.cents, a.currency);
}

/** Multiply by a scalar (e.g. seats, cycle factor); rounds to nearest cent. */
export function scaleMoney(m: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new RangeError(`scaleMoney factor must be finite, received ${factor}`);
  }
  return fromCents(Math.round(m.cents * factor), m.currency);
}

/** Sum a list; returns zero(currency) for an empty list. */
export function sumMoney(items: readonly Money[], currency: string = DEFAULT_CURRENCY): Money {
  return items.reduce((acc, m) => addMoney(acc, m), zero(currency));
}

/** Major-unit number (e.g. 1299 cents -> 12.99). For display/serialization only. */
export function toMajor(m: Money): number {
  return m.cents / 100;
}

/** Human-readable string, e.g. "$1,299.00" for USD or "1,299.00 EUR" otherwise. */
export function formatMoney(m: Money): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: m.currency,
    }).format(toMajor(m));
  } catch {
    // Fallback for exotic/unknown currency codes.
    return `${toMajor(m).toFixed(2)} ${m.currency}`;
  }
}
