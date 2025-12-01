Open PR instructions

Run these commands locally to create the branch, commit, and open a PR.

PowerShell commands (copy & run):

```pwsh
# create branch
git checkout -b feat/postgres-reconcile

# add files
git add prisma/schema.postgres.prisma prisma/migrations/20251201_reconcile_postgres/prisma.sql prisma/migrations/20251201_reconcile_postgres/migration.sql prisma/seed-postgres.js docs/CHANGELOG-2025-12-01.md docs/prisma-postgres-reconcile.md .github/PULL_REQUEST_TEMPLATE.md

# commit
git commit -m "chore(prisma): add Postgres-ready schema, migration notes and seed helper"

# push
git push -u origin feat/postgres-reconcile

# open PR (GitHub CLI)
# gh must be installed and authenticated
gh pr create --fill --title "chore(prisma): Postgres reconcile + seed" --body-file docs/CHANGELOG-2025-12-01.md
```

If `gh` is not available, push the branch and open a PR via the GitHub web UI.
