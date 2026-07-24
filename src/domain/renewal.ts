import type { Money } from "./money.js";
import { fromCents } from "./money.js";
import type { BillingCycle, Subscription } from "./subscription.js";
import { addDays, addMonths, daysBetween } from "./dates.js";

/**
 * Normalize a per-cycle cost to a MONTHLY equivalent (in cents, rounded).
 * Weekly uses the 52-weeks-per-year convention so a full year reconciles.
 */
export function monthlyEquivalent(sub: Subscription): Money {
  const c = sub.cost.cents;
  const cents = normalizeToMonthlyCents(c, sub.billingCycle);
  return fromCents(cents, sub.cost.currency);
}

/** Normalize a per-cycle cost to an ANNUAL equivalent (in cents, rounded). */
export function annualEquivalent(sub: Subscription): Money {
  const c = sub.cost.cents;
  const factor: Record<BillingCycle, number> = {
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    annual: 1,
  };
  return fromCents(Math.round(c * factor[sub.billingCycle]), sub.cost.currency);
}

function normalizeToMonthlyCents(cents: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "monthly":
      return cents;
    case "annual":
      return Math.round(cents / 12);
    case "quarterly":
      return Math.round(cents / 3);
    case "weekly":
      return Math.round((cents * 52) / 12);
  }
}

/** Days until the subscription's next renewal, relative to `today` (ISO). Negative = overdue. */
export function daysUntilRenewal(sub: Subscription, today: string): number {
  return daysBetween(today, sub.renewalDate);
}

/**
 * True when the subscription renews within `windowDays` (inclusive) of `today`.
 * Cancelled subscriptions never trigger. Already-overdue renewals (negative days)
 * count as "within window" so users still see lapsed items needing attention.
 */
export function isRenewingWithin(
  sub: Subscription,
  windowDays: number,
  today: string,
): boolean {
  if (sub.status === "cancelled") return false;
  return daysUntilRenewal(sub, today) <= windowDays;
}

/** Advance an ISO renewal date by exactly one billing cycle. */
export function nextRenewalDate(fromIso: string, cycle: BillingCycle): string {
  switch (cycle) {
    case "weekly":
      return addDays(fromIso, 7);
    case "monthly":
      return addMonths(fromIso, 1);
    case "quarterly":
      return addMonths(fromIso, 3);
    case "annual":
      return addMonths(fromIso, 12);
  }
}
