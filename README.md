# 🛡️ Spend Sentinel — Free

**Local-first SaaS spend & renewal tracking.** Register your software subscriptions, see your true monthly and annual run-rate, and never get surprised by an auto-renewal again. Runs entirely on your machine — your financial data never leaves your computer.

> This is the **free, open-source core** (MIT licensed). It is a complete, standalone product. Premium and Pro editions add alerts, savings analytics, and automated shadow-SaaS discovery — see [Upgrading](#upgrading).

---

## Why it exists

Mid-size teams quietly bleed money on forgotten subscriptions, auto-renewing annual contracts nobody flagged, and paid seats for people who left. Enterprise tools to fix this start in the thousands-per-month. Spend Sentinel gives you the essential 80% — a subscription registry, spend visibility, and renewal warnings — for free, on your own machine.

## Features (Free tier)

| Capability | What you get |
|---|---|
| **Subscription registry** | Add, list, update, remove subscriptions via CLI |
| **CSV import** | Bulk-import from a spreadsheet, with per-row error reporting |
| **Spend dashboard** | Monthly & annual run-rate, totals by billing cycle and department |
| **Renewal warnings** | See everything renewing within N days; overdue items flagged |
| **Local web dashboard** | A clean read-only dashboard at `http://localhost:4317` |
| **Your data stays local** | Plain JSON file on disk. No account, no cloud, no telemetry |

## Quick start

```bash
npm install
npm run build
node dist/interfaces/cli/index.js add \
  --vendor "Figma" --cost 15 --cycle monthly --start 2026-07-15
node dist/interfaces/cli/index.js dashboard
npm run web      # open http://localhost:4317
```

Full instructions in **[SETUP.md](./SETUP.md)**. Day-to-day usage in **[HOW-TO.md](./HOW-TO.md)**.

## Architecture (for contributors)

A strict onion architecture with an inward-only dependency rule:

```
domain/          Pure business types & rules (Money as integer cents, renewal math)
application/     Use-cases + the SubscriptionRepository interface + Zod trust boundary
infrastructure/  JSON file repo (atomic writes) + CSV importer
interfaces/      CLI (Commander) and Web (Express) — thin adapters over the same services
app.ts           Composition root
```

The domain and application layers depend on **nothing** outward — no framework, no I/O. This is what makes the whole core unit-testable in milliseconds and lets storage be swapped without touching business logic.

- **Money is always integer cents** — no floating-point drift in financial totals.
- **Dates are UTC-anchored** — "renews in 3 days" is correct in every timezone.
- **Parse, don't validate** — untrusted input (CSV, API) is validated once at the edge with Zod, then flows as clean typed data.

## Testing

```bash
npm test          # ~56 unit + integration tests
npm run typecheck # strict TypeScript, no errors
```

## Upgrading

This free core is the foundation for two paid editions that build directly on top of it (no re-platforming — same data, same commands, plus more):

**Premium** — renewal **alerts** (webhook/console), annual-vs-monthly **savings analysis**, **seat economics**, department **budget thresholds**, **negotiation intelligence** (`advise`), a renewal **approval workflow**, and a gated **web analytics API**.

**Pro** — everything in Premium plus automated **shadow-SaaS discovery** from bank/card statements, **AI-ready categorization** of untracked spend, **idle-seat / utilization** detection, **multi-entity consolidation**, and pluggable **data connectors** (statement + SSO/SCIM). Licensing is offline-verifiable via **Ed25519** signatures.

See the project's commercial site for tiers and pricing.

## License

MIT — see [LICENSE](./LICENSE). Use it, fork it, ship it.
