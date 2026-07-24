import { describe, it, expect } from "vitest";
import {
  parseIsoDate,
  toIsoDate,
  daysBetween,
  addDays,
  addMonths,
} from "../../src/domain/dates.js";

describe("date parsing", () => {
  it("round-trips ISO dates via UTC midnight", () => {
    expect(toIsoDate(parseIsoDate("2026-01-15"))).toBe("2026-01-15");
  });

  it("rejects malformed or invalid dates", () => {
    expect(() => parseIsoDate("2026-1-5")).toThrow();
    expect(() => parseIsoDate("not-a-date")).toThrow();
    expect(() => parseIsoDate("2026-13-01")).toThrow();
    expect(() => parseIsoDate("2026-02-30")).toThrow();
  });
});

describe("daysBetween", () => {
  it("counts whole days forward and backward", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysBetween("2026-01-31", "2026-01-01")).toBe(-30);
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("handles year boundaries", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });
});

describe("addDays / addMonths", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-01-30", 5)).toBe("2026-02-04");
  });

  it("adds months and clamps end-of-month overflow", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28"); // 2026 not a leap year
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); // 2024 leap year
    expect(addMonths("2026-01-15", 12)).toBe("2027-01-15");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15"); // rolls year
  });
});
