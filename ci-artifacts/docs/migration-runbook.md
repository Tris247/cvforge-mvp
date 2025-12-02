**Migration Runbook — SQLite/JSON → Postgres (dev-focused)**

This runbook documents how to migrate local demo/test data into a Postgres development database, run the test suite, and reproduce the local CI flow used by the project.

Prerequisites
- Docker Desktop (or a Postgres instance reachable from your machine)
- Node.js 18+ and `npm`
- `npx prisma` available (comes with `npm install`)

Local PowerShell quickstart

1. Start Postgres (Docker Compose is provided in the repo):

   docker compose up -d

2. Set environment variable for the local Postgres DB and create schema + client:

   $env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/cvforge_dev'
   npx prisma generate --schema=prisma/schema.postgres.prisma
   npx prisma db push --schema=prisma/schema.postgres.prisma

3. Import demo JSON data (dry-run first, then force):

   # dry-run (safe):
   node .\scripts\migrate-json-to-postgres.js --dry-run

   # run (writes to Postgres):
   node .\scripts\migrate-json-to-postgres.js --force

4. Quick DB verification (scripts provided):

   node .\scripts\verify-postgres.js
   node .\scripts\db-inspect.js
   node .\scripts\db-test-write.js  # optional: writes a test row

5. Run tests locally against Postgres:

   $env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/cvforge_dev'
   npm test

Notes and conventions
- The importer and migration helpers are intended for small demo/test datasets only. Review mapping logic in `scripts/migrate-json-to-postgres.js` and `scripts/migrate-sqlite-to-postgres.js` before attempting production migrations.
- Tests expect a sentinel OpenAI key `OPENAI_API_KEY=test` in CI/local runs when you want to simulate OpenAI being unavailable; the code treats that value as a simulated failure and exercises fallback behavior.
- The CI workflow `ci-postgres.yml` will:
  - Start Postgres 15 as a service
  - Generate Prisma client for `prisma/schema.postgres.prisma`
  - Run `prisma db push`
  - Run `scripts/migrate-json-to-postgres.js --force`
  - Run `npm test`

Rollback / safety
- Importer writes are idempotent/upsert-based and use an on-disk state file by default (`.migrate-json-state.json`) which you can inspect or remove to restart.
- If you want a clean dev DB, simply stop the Postgres container and remove the volume (or run `docker compose down -v`).

CI notes
- The workflow is intentionally conservative: it uses `db push` (no migration history) and seeds demo JSON to ensure tests run deterministically in CI. For production migration you should run proper Prisma migrations and database backups.

Contact / next steps
- If you want me to open a PR with these files and a changelog, tell me and I will prepare the commit message and PR description for you to push and open.

Quick PR commands

If you're happy with the changes and want to open a PR from your machine, run:

```pwsh
git checkout -b feat/postgres-ci-migration
git add .
git commit -m "ci: add Postgres CI workflow and harden migration tooling"
git push -u origin feat/postgres-ci-migration
# then open the PR on GitHub using the UI or gh cli
```
