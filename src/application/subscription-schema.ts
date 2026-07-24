import { z } from "zod";
import { BILLING_CYCLES, SUBSCRIPTION_STATUSES } from "../domain/subscription.js";
import type { Subscription } from "../domain/subscription.js";
import { money, fromCents } from "../domain/money.js";
import { parseIsoDate, nextRenewalDate } from "../domain/index.js";

/**
 * Trust-boundary schema. Accepts loose input (strings from CSV/CLI/JSON) and
 * produces a fully-typed, validated `Subscription`. "Parse, don't validate":
 * once past here, invalid data cannot structurally exist.
 */

const isoDate = z
  .string()
  .refine((s) => {
    try {
      parseIsoDate(s);
      return true;
    } catch {
      return false;
    }
  }, "Expected a valid ISO date (YYYY-MM-DD)");

/** Coerce numeric-ish strings ("$1,299.00", "1299") to a number of major units. */
const majorAmount = z.union([z.number(), z.string()]).transform((v, ctx) => {
  if (typeof v === "number") return v;
  const cleaned = v.replace(/[^0-9.\-]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid amount: "${v}"` });
    return z.NEVER;
  }
  return n;
});

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) =>
    typeof v === "boolean" ? v : ["true", "yes", "y", "1"].includes(v.trim().toLowerCase()),
  );

/** Raw input shape (pre-coercion). `id`/`renewalDate` are optional & derived if absent. */
export const subscriptionInputSchema = z.object({
  id: z.string().min(1).optional(),
  vendor: z.string().min(1, "vendor is required"),
  plan: z.string().min(1).optional(),
  cost: majorAmount,
  currency: z.string().default("USD"),
  billingCycle: z.enum(BILLING_CYCLES),
  seats: z.coerce.number().int().positive().optional(),
  department: z.string().min(1).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).default("active"),
  startDate: isoDate,
  renewalDate: isoDate.optional(),
  autoRenew: boolish.default(true),
  notes: z.string().optional(),
});

export type SubscriptionInput = z.input<typeof subscriptionInputSchema>;

/**
 * Validate raw input into a Subscription. `id` is supplied by the caller (the
 * service generates one for new records); if `renewalDate` is omitted it is
 * derived as one billing cycle after `startDate`.
 */
export function parseSubscription(raw: unknown, id: string): Subscription {
  const p = subscriptionInputSchema.parse(raw);
  const renewalDate = p.renewalDate ?? nextRenewalDate(p.startDate, p.billingCycle);

  // Build conditionally so optional keys are omitted (exactOptionalPropertyTypes).
  return {
    id: p.id ?? id,
    vendor: p.vendor,
    cost: money(p.cost, p.currency),
    billingCycle: p.billingCycle,
    status: p.status,
    startDate: p.startDate,
    renewalDate,
    autoRenew: p.autoRenew,
    ...(p.plan !== undefined ? { plan: p.plan } : {}),
    ...(p.seats !== undefined ? { seats: p.seats } : {}),
    ...(p.department !== undefined ? { department: p.department } : {}),
    ...(p.notes !== undefined ? { notes: p.notes } : {}),
  };
}

/**
 * Schema for the PERSISTED (domain) shape — `cost` is a Money object, not a raw
 * amount. Used to validate records loaded from the JSON data file, which are
 * already normalized. Distinct from `subscriptionInputSchema`, which coerces
 * loose external input.
 */
export const storedSubscriptionSchema = z.object({
  id: z.string().min(1),
  vendor: z.string().min(1),
  plan: z.string().min(1).optional(),
  cost: z.object({ cents: z.number().int(), currency: z.string() }),
  billingCycle: z.enum(BILLING_CYCLES),
  seats: z.number().int().positive().optional(),
  department: z.string().min(1).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  startDate: isoDate,
  renewalDate: isoDate,
  autoRenew: z.boolean(),
  notes: z.string().optional(),
});

/** Validate a persisted record into a Subscription (throws on malformed data). */
export function parseStoredSubscription(raw: unknown): Subscription {
  const p = storedSubscriptionSchema.parse(raw);
  return {
    id: p.id,
    vendor: p.vendor,
    cost: fromCents(p.cost.cents, p.cost.currency),
    billingCycle: p.billingCycle,
    status: p.status,
    startDate: p.startDate,
    renewalDate: p.renewalDate,
    autoRenew: p.autoRenew,
    ...(p.plan !== undefined ? { plan: p.plan } : {}),
    ...(p.seats !== undefined ? { seats: p.seats } : {}),
    ...(p.department !== undefined ? { department: p.department } : {}),
    ...(p.notes !== undefined ? { notes: p.notes } : {}),
  };
}
