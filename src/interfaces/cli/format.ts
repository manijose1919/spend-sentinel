import { formatMoney } from "../../domain/money.js";
import type { Subscription } from "../../domain/subscription.js";
import type { SpendSummary, SpendBreakdownRow } from "../../application/dashboard-service.js";
import type { UpcomingRenewal } from "../../application/renewal-service.js";

/** Render a fixed-width text table from rows of string cells. */
export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );
  const line = (cells: string[]) =>
    cells.map((c, i) => (c ?? "").padEnd(widths[i]!)).join("  ");
  const sep = widths.map((w) => "-".repeat(w)).join("  ");
  return [line(headers), sep, ...rows.map(line)].join("\n");
}

export function formatSubscriptionRow(s: Subscription): string[] {
  return [
    s.id.slice(0, 8),
    s.vendor,
    s.plan ?? "-",
    formatMoney(s.cost),
    s.billingCycle,
    s.status,
    s.renewalDate,
  ];
}

export function renderList(subs: Subscription[]): string {
  if (subs.length === 0) return "No subscriptions yet. Add one with `sentinel add`.";
  return table(
    ["ID", "Vendor", "Plan", "Cost", "Cycle", "Status", "Renews"],
    subs.map(formatSubscriptionRow),
  );
}

export function renderSummary(s: SpendSummary): string {
  const rows = s.byBillingCycle.map((r: SpendBreakdownRow) => [
    r.key,
    String(r.count),
    formatMoney(r.monthly),
    formatMoney(r.annual),
  ]);
  return [
    `Spend Summary (${s.currency})`,
    `  Monthly run-rate: ${formatMoney(s.totalMonthly)}`,
    `  Annual run-rate:  ${formatMoney(s.totalAnnual)}`,
    `  Active: ${s.activeCount}  Trial: ${s.trialCount}  Cancelled: ${s.cancelledCount}`,
    "",
    table(["Billing Cycle", "Count", "Monthly", "Annual"], rows),
  ].join("\n");
}

export function renderRenewals(items: UpcomingRenewal[], windowDays: number): string {
  if (items.length === 0) return `No renewals in the next ${windowDays} days. ✅`;
  const rows = items.map((r) => [
    r.subscription.vendor,
    formatMoney(r.subscription.cost),
    r.subscription.renewalDate,
    r.overdue ? `OVERDUE ${-r.daysUntil}d` : `${r.daysUntil}d`,
    r.subscription.autoRenew ? "auto-renews" : "manual",
  ]);
  return [
    `Renewals within ${windowDays} days:`,
    table(["Vendor", "Cost", "Renews", "In", "Mode"], rows),
  ].join("\n");
}
