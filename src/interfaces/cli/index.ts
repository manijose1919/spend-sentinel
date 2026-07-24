#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { createApp, todayIso, type AppContext } from "../../app.js";
import { importCsvFile } from "../../infrastructure/csv-importer.js";
import { NotFoundError } from "../../application/registry-service.js";
import { renderList, renderSummary, renderRenewals } from "./format.js";

/**
 * Free-tier CLI. `buildProgram` takes an AppContext so tests can inject a fake
 * repository and assert on output without touching disk.
 */
export function buildProgram(app: AppContext, out: (s: string) => void = console.log): Command {
  const program = new Command();
  program
    .name("sentinel")
    .description("SaaS Spend & Renewal Sentinel — track subscriptions and never miss a renewal.")
    .version("0.1.0");

  program
    .command("add")
    .description("Add a subscription")
    .requiredOption("--vendor <name>", "Vendor / product name")
    .requiredOption("--cost <amount>", "Cost per billing cycle (e.g. 49.99)")
    .requiredOption("--cycle <cycle>", "weekly | monthly | quarterly | annual")
    .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
    .option("--plan <plan>", "Plan / tier name")
    .option("--currency <code>", "ISO currency code", "USD")
    .option("--seats <n>", "Number of seats")
    .option("--department <dept>", "Owning department")
    .option("--status <status>", "active | trial | cancelled", "active")
    .option("--renews <date>", "Next renewal date (defaults to start + one cycle)")
    .option("--no-auto-renew", "Mark as manual (not auto-renewing)")
    .option("--notes <text>", "Free-form notes")
    .action(async (opts) => {
      const sub = await app.registry.add({
        vendor: opts.vendor,
        cost: opts.cost,
        currency: opts.currency,
        billingCycle: opts.cycle,
        startDate: opts.start,
        status: opts.status,
        autoRenew: opts.autoRenew,
        ...(opts.plan !== undefined ? { plan: opts.plan } : {}),
        ...(opts.seats !== undefined ? { seats: opts.seats } : {}),
        ...(opts.department !== undefined ? { department: opts.department } : {}),
        ...(opts.renews !== undefined ? { renewalDate: opts.renews } : {}),
        ...(opts.notes !== undefined ? { notes: opts.notes } : {}),
      });
      out(`Added "${sub.vendor}" (${sub.id.slice(0, 8)}), renews ${sub.renewalDate}.`);
    });

  program
    .command("list")
    .description("List all subscriptions")
    .action(async () => {
      out(renderList(await app.registry.list()));
    });

  program
    .command("remove <id>")
    .description("Remove a subscription by id (full or 8-char prefix)")
    .action(async (id: string) => {
      const resolved = await resolveId(app, id);
      const ok = await app.registry.remove(resolved);
      out(ok ? `Removed ${resolved.slice(0, 8)}.` : `No subscription matched "${id}".`);
    });

  program
    .command("import <file>")
    .description("Import subscriptions from a CSV file")
    .action(async (file: string) => {
      const result = await importCsvFile(file);
      for (const sub of result.imported) await app.repo.save(sub);
      out(`Imported ${result.imported.length} subscription(s).`);
      if (result.errors.length > 0) {
        out(`Skipped ${result.errors.length} row(s):`);
        for (const e of result.errors) out(`  row ${e.row}: ${e.message}`);
      }
    });

  program
    .command("dashboard")
    .description("Show a spend summary")
    .action(async () => {
      out(renderSummary(await app.dashboard.summary()));
    });

  program
    .command("renewals")
    .description("Show upcoming renewals")
    .option("--within <days>", "Look-ahead window in days", "30")
    .action(async (opts) => {
      const window = Number.parseInt(opts.within, 10);
      out(renderRenewals(await app.renewals.upcoming(window, todayIso()), window));
    });

  return program;
}

async function resolveId(app: AppContext, idOrPrefix: string): Promise<string> {
  const all = await app.registry.list();
  const matches = all.filter((s) => s.id === idOrPrefix || s.id.startsWith(idOrPrefix));
  if (matches.length === 1) return matches[0]!.id;
  if (matches.length === 0) return idOrPrefix; // let caller report "not found"
  throw new Error(`Ambiguous id "${idOrPrefix}" — matches ${matches.length} subscriptions.`);
}

// Entry point: only run when executed directly (not when imported by tests).
// pathToFileURL yields Node's canonical file URL, correct across Windows drive
// letters and POSIX paths alike.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const app = createApp();
  buildProgram(app)
    .parseAsync(process.argv)
    .catch((err: unknown) => {
      if (err instanceof NotFoundError) {
        console.error(err.message);
      } else {
        console.error(err instanceof Error ? err.message : String(err));
      }
      process.exitCode = 1;
    });
}
