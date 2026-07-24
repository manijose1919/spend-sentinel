import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySubscriptionRepository } from "../../src/infrastructure/in-memory-repository.js";
import { RegistryService, NotFoundError } from "../../src/application/registry-service.js";
import { DashboardService } from "../../src/application/dashboard-service.js";
import { RenewalService } from "../../src/application/renewal-service.js";

function makeServices() {
  const repo = new InMemorySubscriptionRepository();
  return {
    repo,
    registry: new RegistryService(repo),
    dashboard: new DashboardService(repo),
    renewals: new RenewalService(repo),
  };
}

describe("RegistryService", () => {
  let s: ReturnType<typeof makeServices>;
  beforeEach(() => {
    s = makeServices();
  });

  it("adds a subscription with a generated id and derived renewal date", async () => {
    const sub = await s.registry.add({
      vendor: "Figma",
      cost: "15",
      billingCycle: "monthly",
      startDate: "2026-01-10",
    });
    expect(sub.id).toMatch(/[0-9a-f-]{36}/);
    expect(sub.renewalDate).toBe("2026-02-10"); // start + 1 month
    expect(sub.cost.cents).toBe(1500);
  });

  it("updates an existing record and rejects unknown ids", async () => {
    const sub = await s.registry.add({
      vendor: "Slack",
      cost: "10",
      billingCycle: "monthly",
      startDate: "2026-01-01",
    });
    const updated = await s.registry.update(sub.id, { cost: "12.50" });
    expect(updated.cost.cents).toBe(1250);
    expect(updated.vendor).toBe("Slack"); // untouched fields preserved
    await expect(s.registry.update("nope", { vendor: "X" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("removes records", async () => {
    const sub = await s.registry.add({
      vendor: "Notion",
      cost: "8",
      billingCycle: "monthly",
      startDate: "2026-01-01",
    });
    expect(await s.registry.remove(sub.id)).toBe(true);
    expect(await s.registry.remove(sub.id)).toBe(false);
  });
});

describe("DashboardService", () => {
  it("computes monthly & annual run-rate, excluding cancelled", async () => {
    const s = makeServices();
    await s.registry.add({ vendor: "A", cost: "120", billingCycle: "annual", startDate: "2026-01-01" }); // $10/mo
    await s.registry.add({ vendor: "B", cost: "30", billingCycle: "monthly", startDate: "2026-01-01" }); // $30/mo
    await s.registry.add({
      vendor: "C",
      cost: "99",
      billingCycle: "monthly",
      startDate: "2026-01-01",
      status: "cancelled",
    });

    const summary = await s.dashboard.summary();
    expect(summary.totalMonthly.cents).toBe(4000); // 1000 + 3000
    expect(summary.totalAnnual.cents).toBe(48000);
    expect(summary.activeCount).toBe(2);
    expect(summary.cancelledCount).toBe(1);
  });

  it("groups spend by department with an Unassigned bucket", async () => {
    const s = makeServices();
    await s.registry.add({
      vendor: "A",
      cost: "10",
      billingCycle: "monthly",
      startDate: "2026-01-01",
      department: "Eng",
    });
    await s.registry.add({ vendor: "B", cost: "20", billingCycle: "monthly", startDate: "2026-01-01" });

    const rows = await s.dashboard.byDepartment();
    expect(rows.map((r) => r.key).sort()).toEqual(["Eng", "Unassigned"]);
  });
});

describe("RenewalService", () => {
  it("returns renewals within the window, sorted, flagging overdue", async () => {
    const s = makeServices();
    await s.registry.add({
      vendor: "Soon",
      cost: "10",
      billingCycle: "monthly",
      startDate: "2026-01-01",
      renewalDate: "2026-01-20",
    });
    await s.registry.add({
      vendor: "Overdue",
      cost: "10",
      billingCycle: "monthly",
      startDate: "2025-12-01",
      renewalDate: "2025-12-28",
    });
    await s.registry.add({
      vendor: "Later",
      cost: "10",
      billingCycle: "monthly",
      startDate: "2026-01-01",
      renewalDate: "2026-06-01",
    });

    const upcoming = await s.renewals.upcoming(30, "2026-01-01");
    expect(upcoming.map((r) => r.subscription.vendor)).toEqual(["Overdue", "Soon"]);
    expect(upcoming[0]!.overdue).toBe(true);
  });

  it("rejects a negative window", async () => {
    const s = makeServices();
    await expect(s.renewals.upcoming(-1, "2026-01-01")).rejects.toBeInstanceOf(RangeError);
  });
});
