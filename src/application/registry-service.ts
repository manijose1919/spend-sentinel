import { randomUUID } from "node:crypto";
import type { SubscriptionRepository } from "./repository.js";
import type { Subscription } from "../domain/subscription.js";
import { parseSubscription, type SubscriptionInput } from "./subscription-schema.js";

/**
 * Use-cases for managing the subscription registry (add / list / get / update /
 * remove). Depends only on the repository interface, so it is fully unit-testable
 * against the in-memory fake.
 */
export class RegistryService {
  constructor(private readonly repo: SubscriptionRepository) {}

  /** Validate raw input, assign a fresh id, and persist. Returns the stored record. */
  async add(raw: SubscriptionInput): Promise<Subscription> {
    const sub = parseSubscription(raw, randomUUID());
    await this.repo.save(sub);
    return sub;
  }

  async list(): Promise<Subscription[]> {
    return this.repo.getAll();
  }

  async get(id: string): Promise<Subscription | null> {
    return this.repo.getById(id);
  }

  /** Merge a partial update over an existing record (re-validated as a whole). */
  async update(id: string, patch: Partial<SubscriptionInput>): Promise<Subscription> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError(id);

    const merged = parseSubscription(
      {
        ...toInput(existing),
        ...patch,
        id, // id is immutable
      },
      id,
    );
    await this.repo.save(merged);
    return merged;
  }

  async remove(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}

export class NotFoundError extends Error {
  constructor(id: string) {
    super(`Subscription not found: ${id}`);
    this.name = "NotFoundError";
  }
}

/** Flatten a stored Subscription back into raw input shape for re-validation on update. */
function toInput(sub: Subscription): SubscriptionInput {
  return {
    id: sub.id,
    vendor: sub.vendor,
    cost: sub.cost.cents / 100,
    currency: sub.cost.currency,
    billingCycle: sub.billingCycle,
    status: sub.status,
    startDate: sub.startDate,
    renewalDate: sub.renewalDate,
    autoRenew: sub.autoRenew,
    ...(sub.plan !== undefined ? { plan: sub.plan } : {}),
    ...(sub.seats !== undefined ? { seats: sub.seats } : {}),
    ...(sub.department !== undefined ? { department: sub.department } : {}),
    ...(sub.notes !== undefined ? { notes: sub.notes } : {}),
  };
}
