# How To Use Spend Sentinel (Free)

All examples assume the built CLI. In development, substitute `npm run cli -- <args>`.

```bash
alias sentinel="node dist/interfaces/cli/index.js"   # convenience for this guide
```

## Add a subscription

```bash
sentinel add \
  --vendor "Datadog" \
  --cost 1200 \
  --cycle annual \
  --start 2026-03-01 \
  --department Eng \
  --seats 25
```

Required: `--vendor`, `--cost`, `--cycle` (`weekly|monthly|quarterly|annual`), `--start` (`YYYY-MM-DD`).
Optional: `--plan`, `--currency` (default USD), `--seats`, `--department`, `--status` (`active|trial|cancelled`), `--renews` (defaults to start + one cycle), `--no-auto-renew`, `--notes`.

> **Cost is per billing cycle.** `--cost 1200 --cycle annual` means $1,200/year. Spend Sentinel normalizes everything to monthly and annual for you.

## List everything

```bash
sentinel list
```

## Remove a subscription

You can use the full id or just its first 8 characters (shown in `list`):

```bash
sentinel remove e9517484
```

## See your spend

```bash
sentinel dashboard
```

Shows monthly & annual run-rate, active/trial/cancelled counts, and a breakdown by billing cycle. Cancelled subscriptions are excluded from spend totals.

## Check upcoming renewals

```bash
sentinel renewals --within 30      # default window is 30 days
sentinel renewals --within 90
```

Items are sorted soonest-first; anything already past its renewal date is flagged **OVERDUE**.

## Bulk import from a spreadsheet

Export your tracking sheet to CSV with these headers (only the first four are required):

```csv
vendor,cost,billingCycle,startDate,plan,currency,seats,department,status,renewalDate,autoRenew,notes
Figma,15,monthly,2026-01-10,Professional,USD,5,Design,active,,true,
Datadog,"1,200",annual,2026-01-01,Pro,USD,25,Eng,active,,true,Renewal negotiated
```

```bash
sentinel import ./my-subscriptions.csv
```

Invalid rows are **skipped with a reason** (e.g. `row 4: billingCycle: Invalid enum value`) — the rest still import. Amounts may include `$` and commas.

## The web dashboard

```bash
npm run web
# open http://localhost:4317
```

The web dashboard is a **read-only** view (KPIs, upcoming renewals, all subscriptions). Adding and editing is done through the CLI — this keeps the free tier's write-path simple and scriptable. All values are HTML-escaped, so a vendor name is always displayed safely.

## Tips

- **Model trials:** add with `--status trial` so they show in counts but you can filter mentally; convert later with a re-add.
- **Track manual renewals:** use `--no-auto-renew` so the renewal list marks them "manual" — these are the ones you must act on.
- **Back up:** copy `data/subscriptions.json`. That's your whole dataset.

## What's not in Free (and where to get it)

| You want to… | Edition |
|---|---|
| Get webhook/console **alerts** before renewals | Premium |
| See **savings** from switching monthly plans to annual | Premium |
| Track **cost-per-seat** and **department budgets** | Premium |
| Get **negotiation talking points** per subscription (`advise`) | Premium |
| Run a renewal **approval workflow** | Premium |
| Query a gated **web analytics API** (`/api/premium/*`) | Premium |
| **Discover untracked SaaS** from bank statements | Pro |
| **Auto-categorize** shadow spend (AI-ready) | Pro |
| Find **idle seats** and **duplicate contracts across entities** | Pro |
| Plug in **statement / SSO-SCIM connectors** | Pro |
