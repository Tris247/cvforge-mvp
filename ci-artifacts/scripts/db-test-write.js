/**
 * scripts/db-test-write.js
 *
 * Create a test User and Application row to verify writes succeed.
 * Usage: node scripts/db-test-write.js
 */

(async function(){
  let PrismaClient
  try { PrismaClient = require('@prisma/client').PrismaClient } catch (e) { console.error('Missing @prisma/client — run prisma generate'); process.exit(1) }
  const prisma = new PrismaClient()
  try {
    console.log('Using DATABASE_URL (masked):', (process.env.DATABASE_URL||'(not set)').replace(/:(?:[^:@]+)@/, ':*****@'))

    // create a test user
    const user = await prisma.user.upsert({ where: { id: 'test-user-1' }, update: {}, create: { id: 'test-user-1', email: 'test-user-1@local' } })
    console.log('Upserted user:', user.id)

    // ensure company exists first (foreign key on Job.companyId)
    await prisma.company.upsert({ where: { id: 'test-company-1' }, update: {}, create: { id: 'test-company-1', name: 'Test Co', ownerId: user.id } })
    // create a test job to satisfy relation
    const job = await prisma.job.upsert({ where: { id: 'test-job-1' }, update: {}, create: { id: 'test-job-1', title: 'Test Job', description: 'created by test', companyId: 'test-company-1' } })
    console.log('Upserted job:', job.id)

    // create application
    const app = await prisma.application.upsert({ where: { id: 'test-app-1' }, update: {}, create: { id: 'test-app-1', userId: user.id, jobId: job.id, status: 'applied', source: 'test' } })
    console.log('Upserted application:', app.id)

    // print counts
    const counts = {
      applications: await prisma.application.count(),
      users: await prisma.user.count(),
      jobs: await prisma.job.count(),
      companies: await prisma.company.count()
    }
    console.log('Counts after test write:')
    console.table(counts)
  } catch (e) {
    console.error('Test write failed:', e.message || e)
  } finally {
    await prisma.$disconnect()
  }
})()
