import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { SubscriptionRepository } from "../application/repository.js";
import type { Subscription } from "../domain/subscription.js";
import { parseStoredSubscription } from "../application/subscription-schema.js";

/**
 * File-backed repository storing subscriptions as a JSON array. Writes are
 * ATOMIC (write to a temp file, then rename) so a crash mid-write can never
 * corrupt the live data file. Reads cache in memory; every mutation persists.
 *
 * CONCURRENCY: designed for a single-writer, single-process local tool (CLI or
 * one web server). Concurrent `save()`/`delete()` calls within the same process
 * are serialized by the Node event loop per-await but are not transactionally
 * isolated; a multi-writer deployment should swap in a SQL-backed adapter (the
 * Pro tier does exactly this).
 */
export class JsonSubscriptionRepository implements SubscriptionRepository {
  private readonly filePath: string;
  private cache: Map<string, Subscription> | null = null;

  constructor(dataDir: string = defaultDataDir()) {
    this.filePath = resolve(dataDir, "subscriptions.json");
  }

  private async load(): Promise<Map<string, Subscription>> {
    if (this.cache) return this.cache;
    const map = new Map<string, Subscription>();
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error(`Data file is not a JSON array: ${this.filePath}`);
      }
      for (const item of parsed) {
        // Validate every persisted record through the stored-shape schema so a
        // hand-edited data file cannot inject a structurally-invalid record.
        // Malformed records are skipped loudly rather than crashing the load.
        try {
          const sub = parseStoredSubscription(item);
          map.set(sub.id, sub);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[spend-sentinel] Skipping invalid record in data file: ${msg}`);
        }
      }
    } catch (err: unknown) {
      if (!isFileNotFound(err)) throw err; // missing file => empty store (fine)
    }
    this.cache = map;
    return map;
  }

  private async persist(map: Map<string, Subscription>): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    const payload = JSON.stringify([...map.values()], null, 2);
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, this.filePath); // atomic on POSIX & Windows (same volume)
  }

  async getAll(): Promise<Subscription[]> {
    const map = await this.load();
    return [...map.values()];
  }

  async getById(id: string): Promise<Subscription | null> {
    const map = await this.load();
    return map.get(id) ?? null;
  }

  async save(subscription: Subscription): Promise<void> {
    const map = await this.load();
    map.set(subscription.id, subscription);
    await this.persist(map);
  }

  async delete(id: string): Promise<boolean> {
    const map = await this.load();
    const existed = map.delete(id);
    if (existed) await this.persist(map);
    return existed;
  }
}

export function defaultDataDir(): string {
  return process.env["SENTINEL_DATA_DIR"] ?? join(process.cwd(), "data");
}

function isFileNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ENOENT"
  );
}
