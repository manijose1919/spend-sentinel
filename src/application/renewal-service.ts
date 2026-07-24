import type { SubscriptionRepository } from "./repository.js";
import type { Subscription } from "../domain/subscription.js";
import { daysUntilRenewal, isRenewingWithin } from "../domain/renewal.js";

export interface UpcomingRenewal {
  readonly subscription: Subscription;
  readonly daysUntil: number;
  readonly overdue: boolean;
}

/**
 * The free-tier renewal engine: surfaces subscriptions renewing within a window.
 * `today` is injected (not read from the clock) so results are deterministic and
 * testable; callers pass the real current date.
 */
export class RenewalService {
  constructor(private readonly repo: SubscriptionRepository) {}

  async upcoming(windowDays: number, today: string): Promise<UpcomingRenewal[]> {
    if (!Number.isInteger(windowDays) || windowDays < 0) {
      throw new RangeError(`windowDays must be a non-negative integer, got ${windowDays}`);
    }
    const all = await this.repo.getAll();
    return all
      .filter((s) => isRenewingWithin(s, windowDays, today))
      .map((s) => {
        const daysUntil = daysUntilRenewal(s, today);
        return { subscription: s, daysUntil, overdue: daysUntil < 0 };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }
}
