import { describe, it, expect } from "vitest";
import { InMemorySubscriptionRepository } from "../../src/infrastructure/in-memory-repository.js";
import { createApp } from "../../src/app.js";
import { buildProgram } from "../../src/interfaces/cli/index.js";

function harness() {
  const app = createApp(new InMemorySubscriptionRepository());
  const lines: string[] = [];
  const program = buildProgram(app, (s) => lines.push(s));
  const run = (args: string[]) =>
    program.parseAsync(["node", "sentinel", ...args]);
  return { run, lines };
}

describe("CLI integration", () => {
  it("adds then lists a subscription", async () => {
    const { run, lines } = harness();
    await run(["add", "--vendor", "Figma", "--cost", "15", "--cycle", "monthly", "--start", "2026-01-10"]);
    await run(["list"]);
    const output = lines.join("\n");
    expect(output).toContain("Added \"Figma\"");
    expect(output).toContain("Figma");
    expect(output).toContain("$15.00");
  });

  it("shows a dashboard summary", async () => {
    const { run, lines } = harness();
    await run(["add", "--vendor", "A", "--cost", "120", "--cycle", "annual", "--start", "2026-01-01"]);
    await run(["dashboard"]);
    expect(lines.join("\n")).toContain("Annual run-rate:  $120.00");
  });

  it("resolves an 8-char id prefix on remove", async () => {
    const { run, lines } = harness();
    await run(["add", "--vendor", "Zoom", "--cost", "15", "--cycle", "monthly", "--start", "2026-01-01"]);
    const added = lines.find((l) => l.startsWith("Added"))!;
    const prefix = /\(([0-9a-f]{8})\)/.exec(added)![1]!;
    await run(["remove", prefix]);
    expect(lines.some((l) => l.startsWith("Removed"))).toBe(true);
  });
});
