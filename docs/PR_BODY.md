PR: chore(prisma): Postgres reconcile + seed

Summary
- Added `Subscription` model to Prisma schema for demo & Stripe flows.
- Aligned `autoApplyWorker` with Prisma schema and exported the processor for testing.
- Added integration test for auto-apply flow.
- Added Postgres-ready Prisma schema and a starter migration SQL.
- Added a helper script to migrate demo/test rows from the local SQLite `dev.db` to Postgres (`scripts/migrate-sqlite-to-postgres.js`).

How to test locally
1. Run full test suite (still uses SQLite-friendly schema):

```pwsh
npx vitest --run
```

2. To test Postgres migration locally (optional):

```pwsh
# set Postgres DATABASE_URL for your dev DB
$env:DATABASE_URL = 'postgresql://postgres:password@localhost:5432/cvforge_dev'
# generate Prisma client for Postgres schema
npx prisma generate --schema=prisma/schema.postgres.prisma
# apply migrations (preferred)
npx prisma migrate dev --schema=prisma/schema.postgres.prisma --name reconcile_postgres
# optional: run seed helper to import small demo data from dev.db
$env:SQLITE_DB = './dev.db'
node scripts/migrate-sqlite-to-postgres.js --dry-run   # preview operations
node scripts/migrate-sqlite-to-postgres.js            # perform import
```

Notes
- This PR adds Postgres artifacts but doesn't switch CI automatically. Review and run migrations in a safe dev environment before production.
- The migration helper is pragmatic — inspect mappings before running in production.

Suggested reviewers
- @backend-owner
- @devops

