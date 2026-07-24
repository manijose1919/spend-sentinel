import { describe, it, expect } from "vitest";
import { money } from "../../src/domain/money.js";
import type { Subscription } from "../../src/domain/subscription.js";
import {
  monthlyEquivalent,
  annualEquivalent,
  daysUntilRenewal,
  isRenewingWithin,
  nextRenewalDate,
} from "../../src/domain/renewal.js";

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "s1",
    vendor: "Acme",
    cost: money(120),
    billingCycle: "annual",
    status: "active",
    startDate: "2026-01-01",
    renewalDate: "2027-01-01",
    autoRenew: true,
    ...overrides,
  };
}

describe("cost normalization", () => {
  it("normalizes annual to monthly", () => {
    expect(monthlyEquivalent(sub({ cost: money(120), billingCycle: "annual" })).cents).toBe(1000);
  });

  it("normalizes quarterly and weekly to monthly", () => {
    expect(monthlyEquivalent(sub({ cost: money(30), billingCycle: "quarterly" })).cents).toBe(1000);
    expect(monthlyEquivalent(sub({ cost: money(10), billingCycle: "weekly" })).cents).toBe(
      Math.round((1000 * 52) / 12),
    );
  });

  it("normalizes to annual equivalents", () => {
    expect(annualEquivalent(sub({ cost: money(10), billingCycle: "monthly" })).cents).toBe(12000);
    expect(annualEquivalent(sub({ cost: money(10), billingCycle: "weekly" })).cents).toBe(52000);
    expect(annualEquivalent(sub({ cost: money(25), billingCycle: "quarterly" })).cents).toBe(10000);
  });
});

describe("renewal window", () => {
  it("computes days until renewal", () => {
    expect(daysUntilRenewal(sub({ renewalDate: "2026-01-31" }), "2026-01-01")).toBe(30);
  });

  it("flags subscriptions inside the window (inclusive) and overdue ones", () => {
    const s = sub({ renewalDate: "2026-01-20" });
    expect(isRenewingWithin(s, 30, "2026-01-01")).toBe(true);
    expect(isRenewingWithin(s, 10, "2026-01-01")).toBe(false);
    // Overdue (renewal in the past) still counts as needing attention:
    expect(isRenewingWithin(sub({ renewalDate: "2025-12-01" }), 30, "2026-01-01")).toBe(true);
  });

  it("never flags cancelled subscriptions", () => {
    const s = sub({ renewalDate: "2026-01-02", status: "cancelled" });
    expect(isRenewingWithin(s, 30, "2026-01-01")).toBe(false);
  });
});

describe("nextRenewalDate", () => {
  it("advances by one billing cycle", () => {
    expect(nextRenewalDate("2026-01-15", "weekly")).toBe("2026-01-22");
    expect(nextRenewalDate("2026-01-15", "monthly")).toBe("2026-02-15");
    expect(nextRenewalDate("2026-01-15", "quarterly")).toBe("2026-04-15");
    expect(nextRenewalDate("2026-01-15", "annual")).toBe("2027-01-15");
  });
});
