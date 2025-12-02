/**
 * verify-postgres.js
 *
 * Simple verification script that connects to Postgres via the generated Prisma
 * client and prints approximate counts for key tables to help validate the
 * migration.
 */

async function main() {
  let prisma
  try {
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  } catch (e) {
    console.error('Missing @prisma/client — run `npx prisma generate --schema=prisma/schema.postgres.prisma` first')
    process.exit(1)
  }

  try {
    // Print a masked DATABASE_URL for diagnostics
    const rawDbUrl = process.env.DATABASE_URL || '(not set)'
    const masked = rawDbUrl.replace(/:(?:[^:@]+)@/, ':*****@')
    console.log('Using DATABASE_URL:', masked)

    // Quick connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('Postgres connectivity: ok')
    } catch (connErr) {
      console.error('Postgres connectivity test failed:', connErr.message || connErr)
    }

    const counts = {}
    async function tryCount(name, fn) {
      try {
        counts[name] = await fn()
      } catch (err) {
        counts[name] = 'n/a'
        console.error(`Count for ${name} failed:`, err.message || err)
      }
    }

    await tryCount('users', () => prisma.user.count())
    await tryCount('companies', () => prisma.company.count())
    await tryCount('jobs', () => prisma.job.count())
    // CV model may map to client property 'cV' depending on schema casing
    try {
      await tryCount('cvs', () => prisma.cV.count())
    } catch (_) {
      await tryCount('cvs', () => prisma.cv.count())
    }
    await tryCount('autoApplyRules', () => prisma.autoApplyRule.count())
    await tryCount('subscriptions', () => prisma.subscription.count())

    console.log('Postgres verification counts:')
    console.table(counts)
  } finally {
    if (prisma) await prisma.$disconnect()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
