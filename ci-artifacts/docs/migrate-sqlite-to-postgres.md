Migrate SQLite (`dev.db`) → Postgres (practical guide)

Purpose
- This document describes the pragmatic helper script `scripts/migrate-sqlite-to-postgres.js` that copies small demo/test datasets
  from the local SQLite `dev.db` into a Postgres DB accessible via `DATABASE_URL`.

Safety first
- This tool is not a full migration framework. Back up your Postgres DB before running writes.
- By default the script runs in **dry-run** mode if you pass `--dry-run` or set `DRY_RUN=1`.
- To perform writes you MUST pass `--force` or set `CONFIRM_MIGRATE=1` in the environment.

Usage (PowerShell)

1) Prepare Postgres and Prisma client

```pwsh
# set target db
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/cvforge_dev"
# generate prisma client for postgres schema
npx prisma generate --schema=prisma/schema.postgres.prisma
```

2) Install sqlite runtime if needed

```pwsh
npm install sqlite3
```

3) Preview operations (dry-run)

```pwsh
$env:SQLITE_DB = './dev.db'  # optional
node scripts/migrate-sqlite-to-postgres.js --dry-run
```

4) Run import (safe mode requires confirm)

```pwsh
# Option A: provide env var to allow writes
$env:CONFIRM_MIGRATE = '1'
node scripts/migrate-sqlite-to-postgres.js --force

# Option B: rely on env var instead of --force
$env:CONFIRM_MIGRATE = '1'
node scripts/migrate-sqlite-to-postgres.js
```

Flags
- `--dry-run`: print operations but do not write to Postgres
- `--force`: enable writes (alternative: set `CONFIRM_MIGRATE=1` env var)
- `--batch-size=N`: number of rows per transaction chunk (default 50)
- `--limit=N`: limit number of rows processed per table (useful for sampling)
- `--skip=N`: skip first N rows (useful with `--limit`)
 - `--resume`: resume from a previous run using `.migrate-state.json` (or set `MIGRATE_RESUME=1`)
 - `MIGRATE_STATE`: env var to override state file path (default: `.migrate-state.json`)

Notes
- The script attempts to map common column name differences (snake_case vs camelCase) and parse JSON fields when present. Review its source before running in non-dev environments.
- For large datasets, write a bespoke migration that streams rows and applies transformations specific to your domain.
 - The script now supports checkpointing: after each successful chunk the script writes `.migrate-state.json` with per-table progress. Use `--resume` to continue from where it left off.

Contact
- If you want, I can convert this helper into a robust migration tool with transactional checkpoints, progress reporting, and retry semantics.
