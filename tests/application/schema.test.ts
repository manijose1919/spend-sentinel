import { describe, it, expect } from "vitest";
import { parseSubscription } from "../../src/application/subscription-schema.js";

describe("parseSubscription (trust boundary)", () => {
  it("coerces messy string input into a clean Subscription", () => {
    const sub = parseSubscription(
      {
        vendor: "Datadog",
        cost: "$1,200.00",
        billingCycle: "annual",
        startDate: "2026-01-01",
        seats: "25",
        autoRenew: "yes",
      },
      "id-1",
    );
    expect(sub.cost.cents).toBe(120000);
    expect(sub.seats).toBe(25);
    expect(sub.autoRenew).toBe(true);
    expect(sub.renewalDate).toBe("2027-01-01"); // derived
  });

  it("applies defaults (status=active, currency=USD, autoRenew=true)", () => {
    const sub = parseSubscription(
      { vendor: "X", cost: "5", billingCycle: "monthly", startDate: "2026-01-01" },
      "id-2",
    );
    expect(sub.status).toBe("active");
    expect(sub.cost.currency).toBe("USD");
    expect(sub.autoRenew).toBe(true);
  });

  it("omits optional keys when absent (exactOptionalPropertyTypes-safe)", () => {
    const sub = parseSubscription(
      { vendor: "X", cost: "5", billingCycle: "monthly", startDate: "2026-01-01" },
      "id-3",
    );
    expect("plan" in sub).toBe(false);
    expect("seats" in sub).toBe(false);
  });

  it("rejects invalid enums, amounts and dates", () => {
    const base = { vendor: "X", cost: "5", billingCycle: "monthly", startDate: "2026-01-01" };
    expect(() => parseSubscription({ ...base, billingCycle: "biweekly" }, "i")).toThrow();
    expect(() => parseSubscription({ ...base, cost: "abc" }, "i")).toThrow();
    expect(() => parseSubscription({ ...base, startDate: "2026-02-30" }, "i")).toThrow();
    expect(() => parseSubscription({ vendor: "", cost: "5", billingCycle: "monthly", startDate: "2026-01-01" }, "i")).toThrow();
  });
});
