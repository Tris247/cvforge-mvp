Changelog — 2025-12-01

Highlights
- Added `Subscription` model to Prisma schema to support demo and Stripe flows.
- Added integration test for `autoApplyWorker` and exported the processor for deterministic testing.
- Aligned `workers/autoApplyWorker.ts` with Prisma schema (`active` field, `locations`, `remote` handling) and removed writes to non-existent `metadata` column.
- Added Postgres-ready Prisma schema (`prisma/schema.postgres.prisma`) and a starter migration SQL.

Notes
- Local development and tests continue to use the SQLite-friendly `prisma/schema.prisma`. For production, switch to `prisma/schema.postgres.prisma` and run migrations against a Postgres database.
- `prisma/seed-postgres.js` (included) helps import small datasets from `data/*.json` into a Postgres DB for testing.

Files changed/added
- `prisma/schema.prisma` — added `Subscription` model (used for tests/local dev)
- `workers/autoApplyWorker.ts` — schema-alignment and test-friendly export
- `tests/autoapply-worker.integration.spec.ts` — new integration test
- `prisma/schema.postgres.prisma` — Postgres-ready schema
- `prisma/migrations/20251201_reconcile_postgres/migration.sql` — starter SQL
- `docs/prisma-postgres-reconcile.md` — migration documentation

Developer actions
- To run tests locally: `npx vitest --run` (tests passed locally after these changes).
- To migrate to Postgres: follow `docs/prisma-postgres-reconcile.md` (create migration, `npx prisma generate`).
