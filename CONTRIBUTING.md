# Contributing to Spend Sentinel

Thanks for your interest in improving Spend Sentinel! This is the **free, MIT-licensed
core**. Contributions that strengthen the core experience are very welcome.

## Ground rules

- **Keep the core free and self-contained.** The core must not depend on any paid
  tier. Concretely: nothing under `src/domain`, `src/application`, `src/infrastructure`,
  or `src/interfaces` may import from a `tier/` or `modules/` path. CI-worthy features
  that gate behind a license belong in the commercial edition, not here.
- **Respect the architecture.** Business rules live in `domain/`; use-cases in
  `application/` (depending only on the `SubscriptionRepository` interface); I/O in
  `infrastructure/`; CLI/HTTP are thin adapters in `interfaces/`.
- **Money is integer cents. Dates are UTC-anchored.** Don't introduce floats for money
  or local-time date parsing.

## Development setup

```bash
npm install
npm run typecheck     # strict TypeScript, must be clean
npm test              # Vitest — all tests must pass
npm run cli -- list   # run the CLI in dev
npm run web           # run the dashboard
```

## Pull request checklist

1. Add or update **tests** for your change (`tests/` mirrors `src/`).
2. `npm run typecheck` and `npm test` both pass locally.
3. New behavior is documented in `HOW-TO.md` / `README.md` where relevant.
4. Keep commits focused; write a clear description of the *why*.
5. Update `CHANGELOG.md` under `[Unreleased]`.

## Reporting bugs / requesting features

Use the issue templates. For security issues, follow [SECURITY.md](./SECURITY.md)
instead of opening a public issue.

## Code style

- TypeScript strict mode (already configured); no `any` unless truly unavoidable.
- Prefer pure functions in `domain/`; keep side effects at the edges.
- Match the surrounding code's naming and comment density.

By contributing, you agree that your contributions are licensed under the project's
[MIT License](./LICENSE).
