# Examples

Sample data to try Spend Sentinel quickly.

## `subscriptions.csv`

A realistic set of five subscriptions across departments and billing cycles.

```bash
# from the project root, after `npm run build`:
node dist/interfaces/cli/index.js import ./examples/subscriptions.csv
node dist/interfaces/cli/index.js dashboard
node dist/interfaces/cli/index.js renewals --within 60
```

Or in development:

```bash
npm run cli -- import ./examples/subscriptions.csv
npm run cli -- dashboard
```
