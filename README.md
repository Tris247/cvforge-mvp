# CVForge — MVP Scaffold

A minimal, local-ready MVP scaffold for a CV builder + job board prototype.

Target audience: South Africa (initial) and global-ready.

This repository is a starting point with:
- Next.js + TypeScript frontend
- API routes (Next.js) for simple CV CRUD operations
- Minimal CV editor page
- Unit test example
- Docker Compose configuration for PostgreSQL
- Stripe integration stub (placeholder)

Quick start (Windows PowerShell):

1. Install dependencies
```powershell
npm install
```

2. Copy environment variables
```powershell
copy .env.example .env
```

3. (Optional) Start Postgres for local DB
```powershell
docker compose up -d
```

4. Prepare the local DB (optional: sqlite file or Postgres)

If you're using the default sqlite-based local setup the project will automatically create `dev.db` the first time you run. For a Postgres-backed dev environment use docker-compose (recommended for testing migrations):

```pwsh
docker compose up -d
npm run prisma:migrate   # run migrations (interactive for dev)
npm run prisma:seed
```

5. Run the dev server
```powershell
npm run dev
```

6. Run tests
```powershell
npm test
```

 - If you get an error about <Link> or a server-side render error, fix Link usage to avoid nested <a> tags. We fixed these in the scaffold.
 - If hot reload returns 404 for a webpack hot-update.json file, restart the dev server and refresh the browser.
 Background work: Auto-apply supports Redis + BullMQ and falls back to file-backed queue for local development.

Workers
- File-backed demo worker: `npm run worker` (reads `data/queue.json`)
- BullMQ worker: `npm run worker:bull` (requires `REDIS_URL`)

Stripe
- For local testing you can run in demo mode (no `STRIPE_SECRET`): the checkout and webhook handlers accept demo flows and the DB will be updated directly.
- When `STRIPE_SECRET` and `STRIPE_WEBHOOK_SECRET` are set the webhook endpoint (`/api/stripe/webhook`) validates events and persists them to the DB.

CI
- The CI workflow now runs Prisma generate, deploys migrations and seeds the demo DB before running tests. See `.github/workflows/ci.yml`.

What to build next:
- Add authentication (OAuth), Stripe subscription flows
- Implement persistent DB schema and migrations (Prisma)
- Build auto-apply connectors and consent flows
- Improve CV editor and PDF export

If you'd like, I can now wire up Stripe subscriptions, a persistent DB, or build the AI resume rewriting prototype — tell me which next.