# CVForge — Architecture Overview

This document gives a short, practical overview of the scaffolded prototype and suggested next steps for production hardening.

High level
- Frontend: Next.js (React, TypeScript). Pages live in `pages/` and components in `components/`.
- Server/API: Next.js API routes under `pages/api/` for small prototypes. For production a separate API service (Express/Nest/Fastify) is recommended.
- Persistence: Prototype uses file-backed JSON in `data/` for quick iteration. Replace with PostgreSQL + Prisma for production.
- Background work: Auto-apply uses a simple file-backed queue in `data/queue.json`. Replace with Redis + BullMQ / Sidekiq for scaling.
 - Background work: Auto-apply uses a simple file-backed queue in `data/queue.json`. It supports Redis + BullMQ (see `lib/queue.ts`) and has worker implementations in `scripts/autoapply-worker.js` (file/redis poller) and `scripts/autoapply-worker-bull.js` (BullMQ worker). Workers have graceful shutdown and backoff.

Where to start for production
- Add Prisma schema + migrations (Postgres). Use `infra/docker-compose.yml` for local Postgres.
 - Add Prisma schema + migrations (Postgres). Use `infra/docker-compose.yml` for local Postgres. The repository includes a `prisma/seed.js` script to populate demo data (free + paid accounts, jobs, invoices) and CI will run seed before tests.
- Implement proper authentication (NextAuth + OAuth providers) and secure session handling.
- Replace file-backed storage with DB-backed models (users, cvs, jobs, applications, subscriptions) and run migrations.
- Add rate limiting, logging, monitoring and error reporting. Slow/long-running work should move to background worker processes.

Notes
- This prototype is configured to be easy to run locally and experiment with features. Keep the `data/` folder for quick iteration and tests, but move to a robust DB for production.
