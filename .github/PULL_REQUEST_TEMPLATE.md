## Summary

This PR prepares the repository for Postgres-backed local development and CI.

Changes include:
- Migration tooling improvements (`scripts/migrate-sqlite-to-postgres.js` hardening)
- CI workflow for Postgres tests (`.github/workflows/ci-postgres.yml`)
- Migration runbook (`docs/migration-runbook.md`)
- Small test helpers to mock/simulate OpenAI in tests (`lib/openai.js` edits)

## Checklist
- [ ] All tests pass locally with `npm test` against Postgres
- [ ] CI workflow created (`ci-postgres.yml`) — verify run in PR
- [ ] Docs updated (`docs/migration-runbook.md`)
- [ ] No secrets committed

## How to test locally
1. Start Postgres (docker compose up -d)
2. Set `DATABASE_URL` and run `npx prisma generate --schema=prisma/schema.postgres.prisma`
3. Run `npx prisma db push --schema=prisma/schema.postgres.prisma`
4. Import demo data: `node scripts/migrate-json-to-postgres.js --force`
5. Run tests: `npm test`

If you want me to open this PR from the branch on your machine, run:

```pwsh
git checkout -b feat/postgres-ci-migration
git add .
git commit -m "ci: add Postgres CI workflow and harden migration tooling"
git push -u origin feat/postgres-ci-migration
# then open the PR on GitHub using the UI or gh cli
```
## Summary

Short description of the changes in this PR (what, why):
- Added `Subscription` model to Prisma schema for demo & Stripe flows.
- Aligned `autoApplyWorker` with Prisma schema and exported its processor for testing.
- Added integration test for auto-apply flow.
- Added Postgres-ready Prisma schema and starter migration + seed helper.

## Checklist
- [ ] Tests added / updated (existing test suite passes locally).
- [ ] Changelog entry included (see `docs/CHANGELOG-2025-12-01.md`).
- [ ] Migration steps documented (see `docs/prisma-postgres-reconcile.md`).

## How to test locally
1. Run full test suite:

```pwsh
npx vitest --run
```

2. To test Postgres migration locally (optional):

```pwsh
$env:DATABASE_URL = 'postgresql://postgres:password@localhost:5432/cvforge_dev'
# apply migration using prisma migrate with provided postgres schema
npx prisma migrate dev --schema=prisma/schema.postgres.prisma --name reconcile_postgres
npx prisma generate --schema=prisma/schema.postgres.prisma
# optionally run minimal seed helper
node prisma/seed-postgres.js
```

## Notes for reviewers
- The repo currently runs tests against a SQLite-friendly schema. This PR adds a Postgres schema and helper scripts but does NOT switch CI to Postgres automatically.
- For production deployment, run migrations and verify app behaviour with a Postgres instance.
