# Analytics Events

This document lists the server-side events the app records into `data/analytics.jsonl` via `lib/analytics.js`.

Events:

- `user.signup`:
  - payload: `{ userId, email }`
  - emitted by: `pages/api/auth/signup.ts`

- `user.login`:
  - payload: `{ userId, email }`
  - emitted by: `pages/api/auth/login.ts` (instrumented on login)

- `ai.generate.request`:
  - payload: `{ userId, type, tier }`
  - emitted by: `pages/api/ai/generate.ts`

- `marketplace.application.created`:
  - payload: `{ itemId, applicantId, applicantName }`
  - emitted by: `pages/api/marketplace/apply.ts`

- `checkout.started`:
  - payload: `{ userId, tier, subscriptionId, sessionId }`
  - emitted by: `pages/api/stripe/create-checkout-session.ts`

- `checkout.completed`:
  - payload: `{ userId, localSubscriptionId, sessionId }`
  - emitted by: `pages/api/stripe/webhook.ts` on `checkout.session.completed`

Notes:
- Events are appended to `data/analytics.jsonl` (newline-delimited JSON) for local inspection.
- Legacy conversion is no longer performed automatically at runtime. If you have an older `data/analytics.json` file (a JSON array), convert it using the provided script:

```pwsh
node ./scripts/convert-legacy-analytics.js
```

This will append converted events to `data/analytics.jsonl` and move the original file to `data/analytics.json.converted.bak`.
- For production, replace `lib/analytics.js` with a plugin that forwards events to GA4, Segment, or server-side analytics, or run the ingestion worker to persist JSONL events into your database.

Operational notes — scheduled ingestion
- To persist file-backed events into the database on a schedule, this repo provides a GitHub Action workflow: `.github/workflows/ingest-analytics.yml`.
- The workflow runs `node ./scripts/ingest-analytics-worker.js` and requires the `DATABASE_URL` secret to be configured in the repository settings. Optionally set `ANALYTICS_FILE` if your file path differs.
- Example: set repository secret `DATABASE_URL` (Postgres/SQLite connection string). The action runs hourly by default; update the `cron` schedule in the workflow to change frequency.
- Alternatively, run the ingestion worker on a dedicated host/cron using:

```pwsh
# run once locally (requires DATABASE_URL env var)
$env:DATABASE_URL = "<your_database_url>"
node ./scripts/ingest-analytics-worker.js
```

Repair & rotation
- If the JSONL file becomes corrupted, run `node ./scripts/repair-analytics.js` to extract valid lines and move malformed lines to a `.corrupt` file.
- The ingestion worker rotates processed files to `data/analytics.jsonl.processed.<timestamp>`. Keep at least one processed copy until the DB confirms ingestion.
- Keep events small and privacy-conscious. Avoid storing full CV contents or PII in analytics.
