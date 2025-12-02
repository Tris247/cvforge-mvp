Enabling Prisma-backed marketplace

This project uses file-backed JSON for marketplace data by default to keep local dev simple. You can enable DB-backed marketplace storage via Prisma:

1. Set `DATABASE_URL` in your `.env` to a valid DB (sqlite file or Postgres).
2. Enable the feature by setting:

   ```bash
   export USE_PRISMA_MARKETPLACE=true
   ```

3. Generate Prisma client and run migrations:

   ```bash
   npx prisma generate
   npx prisma migrate dev --name add-marketplace
   ```

4. (Optional) Seed the DB using `npm run prisma:seed` if your `prisma/seed.js` provides data.

Notes:
- The APIs default to file-backed storage when `USE_PRISMA_MARKETPLACE` is not set or when Prisma client cannot be loaded.
- CI should run migrations and set `DATABASE_URL` if you want to test DB-backed flows.
