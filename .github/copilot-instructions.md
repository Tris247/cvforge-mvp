## Quick context — what this repo is

- Minimal Next.js + TypeScript MVP for a CV builder + job board. Pages live in `pages/`, React UI in `components/`, API routes under `pages/api/`, and simple background workers under `scripts/`.
- Persistence is mixed: fast prototyping uses JSON files in `data/` (eg. `data/cvs.json`, `data/queue.json`), while production-ready models use Prisma (see `prisma/schema.prisma`).
- Queueing has two modes: file-backed queue (default) and Redis + BullMQ when `REDIS_URL` is set. See `lib/queue.ts`, `scripts/autoapply-worker-bull.js`, and `scripts/autoapply-worker.js`.
  - Workers include graceful shutdown and retry/backoff logic for resilience (see `scripts/autoapply-worker.js` and `scripts/autoapply-worker-bull.js`).

## Important developer flows (how to get things running)

- Install & dev:

```pwsh
npm install
copy .env.example .env
docker compose up -d      # optional: start postgres for DB-backed development
npm run dev               # start Next.js app on http://localhost:3000
```

- Tests: run unit tests with Vitest

```pwsh
npm test
```

- Workers:
  - Lightweight file-backed worker: `npm run worker` (polls data/queue.json and persists via Prisma)
  - BullMQ worker (production): `npm run worker:bull` — requires `REDIS_URL`.

## Key environment variables (found in `.env.example` / used across the repo)

- JWT_SECRET — used for the demo auth cookie flow (`lib/auth.ts`).
- DATABASE_URL — Prisma DB connection string (defaults to sqlite in the repo, but Docker Compose and Postgres are documented for production).
- REDIS_URL — enables Redis / BullMQ mode for queueing.
- OPENAI_API_KEY — enables AI rewrite/cover generation in `pages/api/ai/generate.ts`.
- STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_* — enables Stripe flows in `pages/api/stripe/*` and pages under `pages/account/`.
- SUCCESS_URL, CANCEL_URL — used for Stripe checkout callbacks.

## What to look for — important files & examples (use these as authoritative patterns)

- API & backend patterns
  - `pages/api/ai/generate.ts` — shows quota checks, subscription-tier handling and OpenAI integration with graceful fallback to a local rewriter.
  - `pages/api/stripe/*` — webhook handling, session creation, and invoice processing; tests mock Stripe (`tests/invoice-webhook.spec.ts`).
  - `pages/api/autoapply/*` + `lib/queue.ts` — enqueue/process endpoints and queue abstraction that supports file, Redis, and BullMQ.
  - `lib/auth.ts` — simple JWT cookie auth helper that uses Prisma to lookup users (useful for API auth patterns).
  - `lib/openai.js` — simple OpenAI call wrapper with retry/backoff used by `pages/api/ai/generate.ts`.
  - `lib/telemetry.js` — lightweight telemetry helper (Sentry-friendly when `SENTRY_DSN` is configured).

- Persistence & data
  - `data/` — file-backed JSON for quick iteration (CVs, jobs, queue). Look here when exploring local-only examples (no DB required).
  - `prisma/schema.prisma` — canonical data model. The API routes and workers assume Prisma-generated client usage.

- Background work
  - `scripts/autoapply-worker.js` — poll-based worker (file or Redis list) to persist applications
  - `scripts/autoapply-worker-bull.js` — BullMQ worker for queued jobs using Redis.

## Patterns & conventions unique to this repo

- Dual storage strategy: expect both `data/*` JSON files and Prisma/DB-backed models to exist. APIs often prefer Prisma but local examples may use `data/` for speed.
- Queue fallback behavior: code prefers Redis + BullMQ when available, otherwise falls back to file-backed JSON queues (see `lib/queue.ts`). Tests and local developer flows rely on the file fallback, so you won't always need Redis.
- OpenAI integration: endpoints try to call OpenAI when `OPENAI_API_KEY` exists, but always implement a deterministic fallback for local dev and tests.
- Tests use Vitest and explicitly mock external libs (e.g., `vi.doMock('stripe', ...)` in `tests/invoice-webhook.spec.ts`). When modifying Stripe-related code, update tests accordingly.

## Quick tips for patching or adding features

- Prefer changing `prisma/schema.prisma` for new domain models and run `npm run prisma:migrate` / `prisma generate` locally (DB migration is expected). For prototypes, add to `data/` for faster iteration.
- When adding queue-backed features, implement both a file-backed path and Redis/BullMQ support to keep local development simple.
- Keep API routes idempotent and safe when webhooks are not configured — the project intentionally accepts webhook stubs when Stripe/keys are absent to ease local testing.

## When you need to run or debug integrations

- Stripe webhook debugging: deploy `pages/api/stripe/webhook.ts` behind a tunnel (ngrok) and set `STRIPE_WEBHOOK_SECRET`. For tests, inspect `tests/` patterns where Stripe is mocked.
- Local DB / Prisma: use `docker compose up -d` then `npm run prisma:migrate` and `npm run prisma:seed` to quickly create required rows for demo users. CI also attempts to run migrations and seed before tests where possible.

If any of this is incorrect, incomplete or you want it shorter/longer — tell me which sections you'd like me to expand or examples to add and I'll iterate.
