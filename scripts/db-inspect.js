/**
 * scripts/db-inspect.js
 *
 * Run simple DB diagnostics using the generated Prisma client.
 * Usage: `node scripts/db-inspect.js`
 */

(async function main(){
  let PrismaClient
  try {
    PrismaClient = require('@prisma/client').PrismaClient
  } catch (e) {
    console.error('Missing @prisma/client — run `npx prisma generate --schema=prisma/schema.postgres.prisma`')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const rawDbUrl = process.env.DATABASE_URL || '(not set)'
    const masked = rawDbUrl.replace(/:(?:[^:@]+)@/, ':*****@')
    console.log('Using DATABASE_URL:', masked)

    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('Postgres connectivity: ok')
    } catch (err) {
      console.error('Postgres connectivity test failed:', err.message || err)
    }

    // list public tables
    let tables = []
    try {
      tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
      console.log('Public tables:')
      console.table(tables)
    } catch (err) {
      console.error('Failed to list tables:', err.message || err)
    }

    // For each table, run a raw count to avoid ORM-mapping surprises
    for (const t of tables) {
      const tableName = t.tablename
      try {
        const res = await prisma.$queryRawUnsafe(`SELECT count(*) AS cnt FROM "${tableName}"`)
        const cnt = (res && res[0] && (res[0].cnt ?? res[0].count)) || res[0]
        console.log(`${tableName} ->`, cnt)
      } catch (err) {
        console.log(`${tableName} -> (count failed)`, err.message || err)
      }
    }

    // Also print the ORM counts for key models for comparison
    async function safeCount(fn, label) {
      try {
        const c = await fn()
        console.log(`${label}:`, c)
      } catch (err) {
        console.log(`${label}: (error)`, err.message || err)
      }
    }

    await safeCount(() => prisma.application.count(), 'applications (ORM)')
    await safeCount(() => prisma.user.count(), 'users (ORM)')
    await safeCount(() => prisma.job.count(), 'jobs (ORM)')
    await safeCount(() => prisma.company.count(), 'companies (ORM)')
    await safeCount(() => prisma.cV.count(), 'cvs (ORM)')
    await safeCount(() => prisma.autoApplyRule.count(), 'autoApplyRules (ORM)')
    await safeCount(() => prisma.subscription.count(), 'subscriptions (ORM)')

    // sample raw application rows
    try {
      const rawRows = await prisma.$queryRaw`SELECT * FROM "Application" LIMIT 5`
      console.log('Sample raw Application rows:')
      console.dir(rawRows, { depth: 4 })
    } catch (err) {
      console.error('Failed to fetch raw Application rows:', err.message || err)
    }

  } finally {
    await prisma.$disconnect()
  }
})().catch(e=>{ console.error(e); process.exit(1) })
