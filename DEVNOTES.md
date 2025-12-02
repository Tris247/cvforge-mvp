This workspace was reorganized into a single project at C:\Users\trist\Projects\cvforge-mvp

How to run locally (PowerShell):
1. Copy env vars: copy .env.example .env
2. (Optional) start local Postgres: docker compose up -d
3. Install deps: npm install
4. Start dev server: npm run dev

Files added:
- pages/* (frontend + api routes)
- components/*
- lib/* -> simple file-backed storage for prototype

## CI and Testing Notes (2025-12)

- Dual storage strategy: APIs can use Prisma while tests often use file-backed JSON in `data/` for speed.
- Postgres integration job in CI uses the Postgres Prisma schema with `String[]` fields and seeds demo rows.
- Deterministic marketplace tests set `MARKETPLACE_FILE`/`MARKETPLACE_APPS_FILE` before imports so apply/list/decision handlers resolve the same source files.
- `pretest` creates `data/` to avoid ENOENT for file-backed tests.
- Local guardrails:
	- Postgres-only integration suites are skipped unless `DATABASE_URL` starts with `postgres://`.
	- Playwright e2e under `ci-artifacts/tests/e2e` runs only with `PLAYWRIGHT_E2E=1`; otherwise a skipped suite avoids Vitest conflicts.

## Workers & Queueing

- File-backed worker: `npm run worker` polls `data/queue.json` and persists via Prisma.
- BullMQ worker: `npm run worker:bull` requires `REDIS_URL`.

## Stripe

- Webhook debugging with `STRIPE_WEBHOOK_SECRET` and ngrok; tests mock Stripe.
