import type { SubscriptionRepository } from "../application/repository.js";
import type { Subscription } from "../domain/subscription.js";

/**
 * In-memory repository. Primary use is fast, isolated unit tests, but it also
 * backs any ephemeral/preview scenario. Clones on the way in and out so callers
 * cannot mutate stored records by reference.
 */
export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly store = new Map<string, Subscription>();

  constructor(seed: readonly Subscription[] = []) {
    for (const sub of seed) this.store.set(sub.id, structuredClone(sub));
  }

  async getAll(): Promise<Subscription[]> {
    return [...this.store.values()].map((s) => structuredClone(s));
  }

  async getById(id: string): Promise<Subscription | null> {
    const found = this.store.get(id);
    return found ? structuredClone(found) : null;
  }

  async save(subscription: Subscription): Promise<void> {
    this.store.set(subscription.id, structuredClone(subscription));
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
