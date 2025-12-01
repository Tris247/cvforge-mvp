This workspace was reorganized into a single project at C:\Users\trist\Projects\cvforge-mvp

How to run locally (PowerShell):
1. Copy env vars: copy .env.example .env
2. (Optional) start local Postgres: docker compose up -d
3. Install deps: npm install
4. Start dev server: npm run dev

Files added:
- pages/* (frontend + api routes)
- components/*
- lib/* -> simple file-backed storage for prototype

Next steps: add Prisma schema, proper migrations, Stripe integration, LLM integration and tests.
