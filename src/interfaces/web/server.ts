import express, { type Express } from "express";
import { createApp, type AppContext } from "../../app.js";
import { createApiRouter } from "./api.js";
import { DASHBOARD_HTML } from "./dashboard-html.js";

/** Build the Express app: static dashboard at `/`, REST API under `/api`. */
export function createServer(app: AppContext = createApp()): Express {
  const server = express();

  server.get("/", (_req, res) => {
    res.type("html").send(DASHBOARD_HTML);
  });

  server.use("/api", createApiRouter(app));

  return server;
}

export function resolvePort(): number {
  const raw = process.env["SENTINEL_PORT"];
  const port = raw ? Number.parseInt(raw, 10) : 4317;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError(`SENTINEL_PORT must be 1-65535, got "${raw}"`);
  }
  return port;
}

// Start only when executed directly.
import { pathToFileURL } from "node:url";
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const port = resolvePort();
  createServer().listen(port, () => {
    console.log(`🛡️  Spend Sentinel dashboard: http://localhost:${port}`);
    console.log(`    REST API:                  http://localhost:${port}/api`);
  });
}
