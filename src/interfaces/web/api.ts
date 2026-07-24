import express, { type Router, type Request, type Response, type NextFunction } from "express";
import type { AppContext } from "../../app.js";
import { todayIso } from "../../app.js";
import { NotFoundError } from "../../application/registry-service.js";
import { subscriptionDto, summaryDto, breakdownDto, renewalDto } from "./serialize.js";

/**
 * Free-tier REST API. Each handler is a thin adapter over an application
 * service — no business logic lives here. Async errors are funneled to a single
 * error middleware so no route can silently swallow a failure.
 */
export function createApiRouter(app: AppContext): Router {
  const router = express.Router();
  // Cap request bodies — subscription payloads are tiny; anything larger is
  // abuse. Prevents an unbounded-body DoS if the port is ever exposed.
  router.use(express.json({ limit: "64kb" }));

  router.get("/health", (_req, res) => res.json({ status: "ok" }));

  router.get(
    "/subscriptions",
    wrap(async (_req, res) => {
      const subs = await app.registry.list();
      res.json(subs.map(subscriptionDto));
    }),
  );

  router.post(
    "/subscriptions",
    wrap(async (req, res) => {
      const created = await app.registry.add(req.body);
      res.status(201).json(subscriptionDto(created));
    }),
  );

  router.patch(
    "/subscriptions/:id",
    wrap(async (req, res) => {
      const id = requireParam(req, "id");
      const updated = await app.registry.update(id, req.body);
      res.json(subscriptionDto(updated));
    }),
  );

  router.delete(
    "/subscriptions/:id",
    wrap(async (req, res) => {
      const id = requireParam(req, "id");
      const removed = await app.registry.remove(id);
      if (!removed) throw new NotFoundError(id);
      res.status(204).end();
    }),
  );

  router.get(
    "/dashboard",
    wrap(async (_req, res) => {
      res.json(summaryDto(await app.dashboard.summary()));
    }),
  );

  router.get(
    "/dashboard/by-department",
    wrap(async (_req, res) => {
      const rows = await app.dashboard.byDepartment();
      res.json(rows.map(breakdownDto));
    }),
  );

  router.get(
    "/renewals",
    wrap(async (req, res) => {
      const windowDays = parseWindow(req.query["within"]);
      const items = await app.renewals.upcoming(windowDays, todayIso());
      res.json(items.map(renewalDto));
    }),
  );

  // Centralized error handler — maps domain/validation errors to HTTP codes.
  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (isValidationError(err) || err instanceof RangeError) {
      return res.status(400).json({ error: errorMessage(err) });
    }
    console.error("[spend-sentinel] Unhandled API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  });

  return router;
}

/** Wrap an async handler so rejected promises reach the error middleware. */
function wrap(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw new RangeError(`Missing route parameter: ${name}`);
  }
  return value;
}

function parseWindow(raw: unknown): number {
  if (raw === undefined) return 30;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`'within' must be a non-negative integer, got "${String(raw)}"`);
  }
  return n;
}

function isValidationError(err: unknown): boolean {
  return err !== null && typeof err === "object" && "issues" in err;
}

function errorMessage(err: unknown): string {
  if (isValidationError(err)) {
    const issues = (err as { issues: { path: (string | number)[]; message: string }[] }).issues;
    return issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}
