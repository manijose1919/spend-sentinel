import { describe, it, expect } from "vitest";
import { importCsv } from "../../src/infrastructure/csv-importer.js";

describe("importCsv", () => {
  it("imports valid rows and produces subscriptions", () => {
    const csv = [
      "vendor,cost,billingCycle,startDate,department,seats",
      "Figma,15,monthly,2026-01-10,Design,5",
      "Datadog,\"1,200\",annual,2026-01-01,Eng,25",
    ].join("\n");

    const result = importCsv(csv);
    expect(result.imported).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.imported[0]!.cost.cents).toBe(1500);
    expect(result.imported[1]!.cost.cents).toBe(120000);
  });

  it("collects per-row errors instead of aborting the whole import", () => {
    const csv = [
      "vendor,cost,billingCycle,startDate",
      "Good,10,monthly,2026-01-01",
      "BadCycle,10,biweekly,2026-01-01",
      "BadDate,10,monthly,2026-13-40",
      ",10,monthly,2026-01-01",
    ].join("\n");

    const result = importCsv(csv);
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]!.vendor).toBe("Good");
    expect(result.errors).toHaveLength(3);
    expect(result.errors[0]!.row).toBe(2); // 1-based data rows
  });

  it("treats empty optional cells as absent (not empty strings)", () => {
    const csv = ["vendor,cost,billingCycle,startDate,plan", "X,10,monthly,2026-01-01,"].join("\n");
    const result = importCsv(csv);
    expect(result.imported).toHaveLength(1);
    expect("plan" in result.imported[0]!).toBe(false);
  });
});
