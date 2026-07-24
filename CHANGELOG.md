# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-24

Initial public release of the free core.

### Added
- **Subscription registry** — add, list, update, and remove subscriptions via the CLI.
- **CSV import** with per-row validation and error reporting (partial imports supported).
- **Spend dashboard** — monthly & annual run-rate, totals by billing cycle and department; cancelled subscriptions excluded from spend.
- **Renewal warnings** — surface subscriptions renewing within a configurable window; overdue items flagged.
- **Local web dashboard** (Express) — read-only KPIs, upcoming renewals, and subscription list at `http://localhost:4317`, with all user input HTML-escaped.
- **REST API** under `/api` (health, subscriptions CRUD, dashboard, renewals).
- **Local-first JSON storage** with atomic writes and load-time record validation (invalid records quarantined, never crash the load).
- Integer-cents `Money` value object (no floating-point drift) and UTC-anchored date math (timezone-safe renewal calculations).

### Security
- Request body-size limit on the web API.
- Output escaping across the dashboard to prevent stored XSS from imported vendor names.

[Unreleased]: https://github.com/manijose1919/spend-sentinel/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/manijose1919/spend-sentinel/releases/tag/v1.0.0
