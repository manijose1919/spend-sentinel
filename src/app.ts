import type { SubscriptionRepository } from "./application/repository.js";
import { JsonSubscriptionRepository, defaultDataDir } from "./infrastructure/json-repository.js";
import { RegistryService } from "./application/registry-service.js";
import { DashboardService } from "./application/dashboard-service.js";
import { RenewalService } from "./application/renewal-service.js";

/**
 * Composition root. Wires the concrete repository to the free-tier services.
 * Paid modules attach to this context in Layer 4 via the tier gate — the free
 * build never references them.
 */
export interface AppContext {
  readonly repo: SubscriptionRepository;
  readonly registry: RegistryService;
  readonly dashboard: DashboardService;
  readonly renewals: RenewalService;
}

export function createApp(repo: SubscriptionRepository = new JsonSubscriptionRepository(defaultDataDir())): AppContext {
  return {
    repo,
    registry: new RegistryService(repo),
    dashboard: new DashboardService(repo),
    renewals: new RenewalService(repo),
  };
}

/** Current date as an ISO calendar string (UTC), for renewal calculations. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
