# Setup — Spend Sentinel (Free)

## Requirements

- **Node.js ≥ 20** (developed and tested on Node 24)
- npm (bundled with Node)
- Works on Windows, macOS, and Linux

Check your version:

```bash
node --version
```

## 1. Install dependencies

```bash
npm install
```

## 2. Configure (optional)

All configuration is optional. To customize, copy the example env file:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `SENTINEL_DATA_DIR` | `./data` | Folder holding your `subscriptions.json` data file |
| `SENTINEL_PORT` | `4317` | Port for the local web dashboard |

> The `data/` folder is git-ignored — your subscription data is never committed.

## 3. Run in development (no build step)

Uses `tsx` to run TypeScript directly:

```bash
npm run cli -- list            # run any CLI command after `--`
npm run web                    # start the web dashboard
```

## 4. Build for production

```bash
npm run build                  # compiles TypeScript to ./dist
node dist/interfaces/cli/index.js list
node dist/interfaces/web/server.js
```

### Optional: install the `sentinel` command globally

```bash
npm run build
npm link                       # makes `sentinel` available on your PATH
sentinel dashboard
```

## 5. Verify the install

```bash
npm run typecheck              # should report no errors
npm test                       # should pass all tests
```

## Data & backups

Your entire dataset is a single human-readable file at `${SENTINEL_DATA_DIR}/subscriptions.json`. To back up, copy that file. To migrate machines, copy it to the new machine's data directory. Writes are atomic (temp-file + rename), so the file is never left half-written if the process is interrupted.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `EADDRINUSE` on `npm run web` | Another process uses port 4317. Set `SENTINEL_PORT=4400`. |
| CLI prints nothing | Ensure you're on Node ≥ 20; run `node --version`. |
| "Skipping invalid record" warning | A record in your data file failed validation and was quarantined — check `subscriptions.json` for a hand-edit mistake. |
