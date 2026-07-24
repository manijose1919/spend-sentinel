import type { Subscription } from "../domain/subscription.js";

/**
 * Persistence boundary for subscriptions. Business logic depends ONLY on this
 * interface (Dependency Inversion) — the JSON file, or a future SQL/Postgres
 * adapter, is an interchangeable detail.
 */
export interface SubscriptionRepository {
  getAll(): Promise<Subscription[]>;
  getById(id: string): Promise<Subscription | null>;
  /** Insert or replace by id (upsert). */
  save(subscription: Subscription): Promise<void>;
  /** Returns true if a record was removed, false if id was absent. */
  delete(id: string): Promise<boolean>;
}
