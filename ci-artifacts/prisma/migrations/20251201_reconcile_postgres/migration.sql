-- Migration: Reconcile schema for PostgreSQL
-- This SQL is a starter migration script. Prefer running `npx prisma migrate dev` against a Postgres
-- database using the `prisma/schema.postgres.prisma` file to generate accurate migrations.

-- Example: create subscription table (if not present). Adjust as needed for your DB state.

CREATE TABLE IF NOT EXISTS "Subscription" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  tier TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  "stripeSubscriptionId" TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_subscription_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Note: this migration assumes the core tables ("User", "Job", "Company", etc.) already exist.
-- For a fresh DB, prefer `npx prisma migrate dev --schema=prisma/schema.postgres.prisma --name init`.
