# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- Add GitHub Actions workflow `ci-postgres.yml` to run tests against Postgres in CI.
- Harden `scripts/migrate-sqlite-to-postgres.js` mapping logic (normalize arrays/booleans, strip nulls, Application import).
- Add migration runbook `docs/migration-runbook.md` with local commands and PR instructions.
- Add PR template `.github/PULL_REQUEST_TEMPLATE.md` to assist reviewers.
- Adjust `lib/openai.js` to simulate OpenAI failure when `OPENAI_API_KEY=test` and return `null` when no key is present (keeps tests deterministic).
