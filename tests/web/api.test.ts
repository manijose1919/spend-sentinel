import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createServer } from "../../src/interfaces/web/server.js";
import { createApp } from "../../src/app.js";
import { InMemorySubscriptionRepository } from "../../src/infrastructure/in-memory-repository.js";

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp(new InMemorySubscriptionRepository());
  server = createServer(app).listen(0);
  await new Promise<void>((r) => server.once("listening", r));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

async function api(path: string, init?: RequestInit) {
  const res = await fetch(base + path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = res.status === 204 ? null : await res.json();
  return { status: res.status, body };
}

describe("REST API", () => {
  it("serves the dashboard HTML at /", async () => {
    const res = await fetch(base + "/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("Spend Sentinel");
  });

  it("reports health", async () => {
    expect((await api("/api/health")).body).toEqual({ status: "ok" });
  });

  it("creates, lists, updates and deletes a subscription", async () => {
    const create = await api("/api/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        vendor: "Linear",
        cost: "8",
        billingCycle: "monthly",
        startDate: "2026-01-01",
      }),
    });
    expect(create.status).toBe(201);
    expect(create.body.cost.formatted).toBe("$8.00");
    expect(create.body.monthlyEquivalent.cents).toBe(800);
    const id = create.body.id;

    const list = await api("/api/subscriptions");
    expect(list.body).toHaveLength(1);

    const patch = await api(`/api/subscriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ cost: "10" }),
    });
    expect(patch.body.cost.cents).toBe(1000);

    const del = await api(`/api/subscriptions/${id}`, { method: "DELETE" });
    expect(del.status).toBe(204);
    expect((await api("/api/subscriptions")).body).toHaveLength(0);
  });

  it("returns 400 on invalid input and 404 on missing records", async () => {
    const bad = await api("/api/subscriptions", {
      method: "POST",
      body: JSON.stringify({ vendor: "X", cost: "5", billingCycle: "nope", startDate: "2026-01-01" }),
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBeTruthy();

    const missing = await api("/api/subscriptions/does-not-exist", { method: "DELETE" });
    expect(missing.status).toBe(404);
  });

  it("returns dashboard and renewals payloads", async () => {
    await api("/api/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        vendor: "Renews Soon",
        cost: "120",
        billingCycle: "annual",
        startDate: "2020-01-01",
        renewalDate: "2020-02-01",
      }),
    });
    const dash = await api("/api/dashboard");
    expect(dash.body.totalMonthly.cents).toBeGreaterThan(0);

    const ren = await api("/api/renewals?within=30");
    expect(Array.isArray(ren.body)).toBe(true);
    expect(ren.body[0].overdue).toBe(true); // 2020 renewal is long overdue

    const badWindow = await api("/api/renewals?within=-5");
    expect(badWindow.status).toBe(400);
  });
});
