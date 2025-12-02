Postgres reconciliation notes

Purpose
- Provide a Postgres-ready Prisma schema and migration guidance. The repository currently uses a SQLite-friendly
  `prisma/schema.prisma` for local dev/tests. This document explains how to migrate to PostgreSQL safely.

Files added
- `prisma/schema.postgres.prisma` — a Postgres-friendly Prisma schema (enums, Json, arrays).
- `prisma/migrations/20251201_reconcile_postgres/migration.sql` — starter SQL for Subscription table.

Recommended local steps
1. Ensure you have a Postgres dev database and set `DATABASE_URL` in your environment. Example (PowerShell):

```pwsh
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/cvforge_dev"
```

2. Generate a migration and apply it with Prisma (preferred):

```pwsh
npx prisma migrate dev --schema=prisma/schema.postgres.prisma --name reconcile_postgres
npx prisma generate --schema=prisma/schema.postgres.prisma
```

3. If you're migrating data from the SQLite dev DB, export and import data carefully. For small datasets you can:
   - Use `sqlite3` to dump data and write scripts to insert into Postgres
   - Or write a Node script that reads `data/*.json` or the SQLite DB via Prisma and writes to Postgres via Prisma

Notes & caveats
- This `schema.postgres.prisma` reintroduces `enum`, `String[]`, and `Json` fields that are Postgres-specific features.
- Run migrations in a controlled environment and back up your database before applying production migrations.
- After running migrations, update CI to use the Postgres schema and run `npx prisma generate` in CI.

If you want, I can:
- Create a `prisma/seed-postgres.js` helper to migrate test/demo rows from `dev.db` to Postgres.
- Draft a safe data-migration script to move `dev.db` contents into a Postgres instance.
