import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonSubscriptionRepository } from "../../src/infrastructure/json-repository.js";
import { InMemorySubscriptionRepository } from "../../src/infrastructure/in-memory-repository.js";
import { money } from "../../src/domain/money.js";
import type { Subscription } from "../../src/domain/subscription.js";
import type { SubscriptionRepository } from "../../src/application/repository.js";

function sub(id: string): Subscription {
  return {
    id,
    vendor: `Vendor-${id}`,
    cost: money(49.99),
    billingCycle: "monthly",
    status: "active",
    startDate: "2026-01-01",
    renewalDate: "2026-02-01",
    autoRenew: true,
  };
}

// Contract test: run the SAME suite against both implementations so they stay
// behaviourally interchangeable (Liskov substitutability for the interface).
function repositoryContract(name: string, make: () => Promise<SubscriptionRepository>) {
  describe(`SubscriptionRepository contract: ${name}`, () => {
    let repo: SubscriptionRepository;
    beforeEach(async () => {
      repo = await make();
    });

    it("starts empty", async () => {
      expect(await repo.getAll()).toEqual([]);
    });

    it("saves and reads back by id", async () => {
      await repo.save(sub("a"));
      expect((await repo.getById("a"))?.vendor).toBe("Vendor-a");
      expect(await repo.getById("missing")).toBeNull();
    });

    it("upserts on duplicate id", async () => {
      await repo.save(sub("a"));
      await repo.save({ ...sub("a"), vendor: "Renamed" });
      expect((await repo.getAll()).length).toBe(1);
      expect((await repo.getById("a"))?.vendor).toBe("Renamed");
    });

    it("deletes and reports whether the id existed", async () => {
      await repo.save(sub("a"));
      expect(await repo.delete("a")).toBe(true);
      expect(await repo.delete("a")).toBe(false);
      expect(await repo.getAll()).toEqual([]);
    });
  });
}

repositoryContract("in-memory", async () => new InMemorySubscriptionRepository());

describe("JsonSubscriptionRepository (persistence specifics)", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), "sentinel-test-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("persists across fresh instances (survives 'restart')", async () => {
    const a = new JsonSubscriptionRepository(dir);
    await a.save(sub("x"));

    const b = new JsonSubscriptionRepository(dir);
    expect((await b.getById("x"))?.vendor).toBe("Vendor-x");
    expect(money(49.99).cents).toBe((await b.getById("x"))?.cost.cents);
  });

  it("treats a missing data file as an empty store", async () => {
    const repo = new JsonSubscriptionRepository(join(dir, "does", "not", "exist"));
    expect(await repo.getAll()).toEqual([]);
  });

  it("quarantines invalid records on load instead of crashing", async () => {
    // Hand-craft a data file with one good and one structurally-invalid record.
    const good = sub("good");
    const bad = { ...sub("bad"), billingCycle: "fortnightly" };
    await fs.writeFile(
      join(dir, "subscriptions.json"),
      JSON.stringify([good, bad], null, 2),
      "utf8",
    );
    const repo = new JsonSubscriptionRepository(dir);
    const all = await repo.getAll();
    expect(all.map((s) => s.id)).toEqual(["good"]); // bad one skipped
  });

  it("leaves no stray temp files after a write", async () => {
    const repo = new JsonSubscriptionRepository(dir);
    await repo.save(sub("x"));
    const files = await fs.readdir(dir);
    expect(files.filter((f) => f.endsWith(".tmp"))).toEqual([]);
    expect(files).toContain("subscriptions.json");
  });
});

// Also run the shared contract against the Json repo in a temp dir.
repositoryContract("json", async () => {
  const dir = await fs.mkdtemp(join(tmpdir(), "sentinel-contract-"));
  return new JsonSubscriptionRepository(dir);
});
