import type { Money } from "../../domain/money.js";
import { formatMoney } from "../../domain/money.js";
import type { Subscription } from "../../domain/subscription.js";
import type { SpendSummary, SpendBreakdownRow } from "../../application/dashboard-service.js";
import type { UpcomingRenewal } from "../../application/renewal-service.js";
import { monthlyEquivalent, annualEquivalent } from "../../domain/renewal.js";

/** Wire representation of Money — client displays `formatted`, never re-computes. */
export interface MoneyDto {
  cents: number;
  currency: string;
  formatted: string;
}

export const moneyDto = (m: Money): MoneyDto => ({
  cents: m.cents,
  currency: m.currency,
  formatted: formatMoney(m),
});

export interface SubscriptionDto {
  id: string;
  vendor: string;
  plan: string | null;
  cost: MoneyDto;
  monthlyEquivalent: MoneyDto;
  annualEquivalent: MoneyDto;
  billingCycle: string;
  seats: number | null;
  department: string | null;
  status: string;
  startDate: string;
  renewalDate: string;
  autoRenew: boolean;
  notes: string | null;
}

export function subscriptionDto(s: Subscription): SubscriptionDto {
  return {
    id: s.id,
    vendor: s.vendor,
    plan: s.plan ?? null,
    cost: moneyDto(s.cost),
    monthlyEquivalent: moneyDto(monthlyEquivalent(s)),
    annualEquivalent: moneyDto(annualEquivalent(s)),
    billingCycle: s.billingCycle,
    seats: s.seats ?? null,
    department: s.department ?? null,
    status: s.status,
    startDate: s.startDate,
    renewalDate: s.renewalDate,
    autoRenew: s.autoRenew,
    notes: s.notes ?? null,
  };
}

export function summaryDto(s: SpendSummary) {
  return {
    currency: s.currency,
    totalMonthly: moneyDto(s.totalMonthly),
    totalAnnual: moneyDto(s.totalAnnual),
    activeCount: s.activeCount,
    trialCount: s.trialCount,
    cancelledCount: s.cancelledCount,
    byBillingCycle: s.byBillingCycle.map(breakdownDto),
  };
}

export function breakdownDto(r: SpendBreakdownRow) {
  return {
    key: r.key,
    count: r.count,
    monthly: moneyDto(r.monthly),
    annual: moneyDto(r.annual),
  };
}

export function renewalDto(r: UpcomingRenewal) {
  return {
    subscription: subscriptionDto(r.subscription),
    daysUntil: r.daysUntil,
    overdue: r.overdue,
  };
}
