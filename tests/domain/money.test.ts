import { describe, it, expect } from "vitest";
import {
  money,
  fromCents,
  zero,
  addMoney,
  subtractMoney,
  scaleMoney,
  sumMoney,
  toMajor,
  formatMoney,
} from "../../src/domain/money.js";

describe("money()", () => {
  it("converts major units to integer cents without float drift", () => {
    expect(money(12.99).cents).toBe(1299);
    expect(money(0.1).cents).toBe(10);
    // The classic 0.1 + 0.2 trap, done via cents:
    expect(addMoney(money(0.1), money(0.2)).cents).toBe(30);
  });

  it("rounds to the nearest cent", () => {
    expect(money(9.999).cents).toBe(1000);
    expect(money(9.994).cents).toBe(999);
  });

  it("defaults to USD and normalizes currency codes", () => {
    expect(money(1).currency).toBe("USD");
    expect(money(1, "eur").currency).toBe("EUR");
  });

  it("rejects invalid currency codes and non-finite amounts", () => {
    expect(() => money(1, "US")).toThrow();
    expect(() => money(Number.NaN)).toThrow();
    expect(() => fromCents(1.5)).toThrow(); // non-integer cents
  });
});

describe("arithmetic", () => {
  it("adds, subtracts and scales", () => {
    expect(addMoney(money(10), money(5)).cents).toBe(1500);
    expect(subtractMoney(money(10), money(5)).cents).toBe(500);
    expect(scaleMoney(money(9.99), 3).cents).toBe(2997);
  });

  it("scales with rounding", () => {
    expect(scaleMoney(fromCents(100), 1 / 3).cents).toBe(33);
  });

  it("refuses to combine mismatched currencies", () => {
    expect(() => addMoney(money(1, "USD"), money(1, "EUR"))).toThrow(/currencies/i);
  });

  it("sums a list and returns zero for empty", () => {
    expect(sumMoney([money(1), money(2), money(3)]).cents).toBe(600);
    expect(sumMoney([]).cents).toBe(0);
    expect(zero("GBP").currency).toBe("GBP");
  });
});

describe("formatting", () => {
  it("renders currency strings", () => {
    expect(formatMoney(money(1299.5))).toBe("$1,299.50");
    expect(toMajor(fromCents(1299))).toBe(12.99);
  });
});
