# Release checklist

1. Ensure `.env` in your environment contains `DATABASE_URL`, `STRIPE_SECRET` (if using Stripe) and other required secrets.
2. Run migrations and seed locally (recommended):

```pwsh
npx prisma migrate deploy
node prisma/seed.js
```

3. Build a Docker image for releases:

```pwsh
docker build -t cvforge-mvp:latest .
```

4. Push image to registry and create a release tag.

Notes
- CI pipeline runs `prisma generate` and attempts to `prisma migrate deploy` + seed before running tests.
- For zero-downtime releases ensure your deployed environment runs DB migrations first and seeds only when needed.
