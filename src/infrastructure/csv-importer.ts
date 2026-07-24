import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { parse } from "csv-parse/sync";
import type { Subscription } from "../domain/subscription.js";
import { parseSubscription } from "../application/subscription-schema.js";

export interface ImportError {
  readonly row: number; // 1-based data row (header excluded)
  readonly message: string;
}

export interface ImportResult {
  readonly imported: Subscription[];
  readonly errors: ImportError[];
}

/**
 * Parse a CSV buffer into validated Subscriptions. Invalid rows are collected as
 * errors rather than aborting the whole import — a partial import with a clear
 * error report is far more useful than an all-or-nothing failure on row 47.
 *
 * Expected headers: vendor, cost, billingCycle, startDate (required);
 * plan, currency, seats, department, status, renewalDate, autoRenew, notes (optional).
 */
export function importCsv(content: string): ImportResult {
  const records = parse(content, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const imported: Subscription[] = [];
  const errors: ImportError[] = [];

  records.forEach((record, index) => {
    // Drop empty-string optionals so schema defaults/optionals apply cleanly.
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(record)) {
      if (v !== "") cleaned[k] = v;
    }
    try {
      imported.push(parseSubscription(cleaned, randomUUID()));
    } catch (err: unknown) {
      errors.push({ row: index + 1, message: summarizeError(err) });
    }
  });

  return { imported, errors };
}

export async function importCsvFile(path: string): Promise<ImportResult> {
  const content = await fs.readFile(path, "utf8");
  return importCsv(content);
}

function summarizeError(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: { path: (string | number)[]; message: string }[] }).issues;
    return issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}
