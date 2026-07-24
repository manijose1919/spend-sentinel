import type { Money } from "./money.js";

export const BILLING_CYCLES = ["weekly", "monthly", "quarterly", "annual"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const SUBSCRIPTION_STATUSES = ["active", "trial", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * A single SaaS subscription line-item. `cost` is the price charged PER billing
 * cycle (not normalized) — normalization to monthly/annual lives in renewal.ts.
 * Dates are ISO calendar dates ("YYYY-MM-DD"), interpreted as UTC.
 */
export interface Subscription {
  readonly id: string;
  readonly vendor: string;
  readonly plan?: string;
  readonly cost: Money;
  readonly billingCycle: BillingCycle;
  readonly seats?: number;
  readonly department?: string;
  readonly status: SubscriptionStatus;
  /** When the subscription began (ISO date). */
  readonly startDate: string;
  /** Next renewal / charge date (ISO date). */
  readonly renewalDate: string;
  readonly autoRenew: boolean;
  readonly notes?: string;
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return typeof value === "string" && (BILLING_CYCLES as readonly string[]).includes(value);
}

export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return (
    typeof value === "string" &&
    (SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
  );
}
