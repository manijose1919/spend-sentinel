import type { SubscriptionRepository } from "./repository.js";
import type { Money } from "../domain/money.js";
import { addMoney, zero } from "../domain/money.js";
import { monthlyEquivalent, annualEquivalent } from "../domain/renewal.js";
import type { Subscription } from "../domain/subscription.js";

export interface SpendBreakdownRow {
  readonly key: string;
  readonly monthly: Money;
  readonly annual: Money;
  readonly count: number;
}

export interface SpendSummary {
  readonly currency: string;
  readonly totalMonthly: Money;
  readonly totalAnnual: Money;
  readonly activeCount: number;
  readonly trialCount: number;
  readonly cancelledCount: number;
  readonly byBillingCycle: SpendBreakdownRow[];
}

/**
 * Read-only spend aggregations for the free dashboard. Only `active` and `trial`
 * subscriptions contribute to spend totals (cancelled ones cost nothing).
 *
 * MIXED CURRENCIES: the free tier assumes a single reporting currency. If records
 * span multiple currencies, aggregation would throw on mismatch — so we group and
 * total per-currency and surface the dominant currency, ignoring cross-currency
 * conversion (that's a Pro-tier feature).
 */
export class DashboardService {
  constructor(private readonly repo: SubscriptionRepository) {}

  async summary(): Promise<SpendSummary> {
    const all = await this.repo.getAll();
    const spending = all.filter((s) => s.status !== "cancelled");
    const currency = dominantCurrency(spending);
    const inCurrency = spending.filter((s) => s.cost.currency === currency);

    const totalMonthly = inCurrency.reduce(
      (acc, s) => addMoney(acc, monthlyEquivalent(s)),
      zero(currency),
    );
    const totalAnnual = inCurrency.reduce(
      (acc, s) => addMoney(acc, annualEquivalent(s)),
      zero(currency),
    );

    return {
      currency,
      totalMonthly,
      totalAnnual,
      activeCount: all.filter((s) => s.status === "active").length,
      trialCount: all.filter((s) => s.status === "trial").length,
      cancelledCount: all.filter((s) => s.status === "cancelled").length,
      byBillingCycle: groupBy(inCurrency, currency, (s) => s.billingCycle),
    };
  }

  /** Spend grouped by department (subscriptions without one bucket as "Unassigned"). */
  async byDepartment(): Promise<SpendBreakdownRow[]> {
    const all = await this.repo.getAll();
    const spending = all.filter((s) => s.status !== "cancelled");
    const currency = dominantCurrency(spending);
    const inCurrency = spending.filter((s) => s.cost.currency === currency);
    return groupBy(inCurrency, currency, (s) => s.department ?? "Unassigned");
  }
}

function dominantCurrency(subs: readonly Subscription[]): string {
  if (subs.length === 0) return "USD";
  const counts = new Map<string, number>();
  for (const s of subs) counts.set(s.cost.currency, (counts.get(s.cost.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

function groupBy(
  subs: readonly Subscription[],
  currency: string,
  keyOf: (s: Subscription) => string,
): SpendBreakdownRow[] {
  const groups = new Map<string, Subscription[]>();
  for (const s of subs) {
    const k = keyOf(s);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(s);
  }
  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      count: items.length,
      monthly: items.reduce((a, s) => addMoney(a, monthlyEquivalent(s)), zero(currency)),
      annual: items.reduce((a, s) => addMoney(a, annualEquivalent(s)), zero(currency)),
    }))
    .sort((a, b) => b.annual.cents - a.annual.cents);
}
