import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { processor } from '../workers/autoApplyWorker'

const prisma = new PrismaClient()

const isPostgres = typeof process !== 'undefined' && process.env.DATABASE_URL && /^postgres(ql)?:\/\//i.test(String(process.env.DATABASE_URL))
const maybeDescribe = isPostgres ? describe : describe.skip

maybeDescribe('autoapply worker integration', () => {
  let user: any
  let owner: any
  let company: any
  let job: any
  let rule: any
  let app: any

  beforeAll(async () => {
    // create an employer owner for company
    owner = await prisma.user.create({ data: { email: `owner+${Date.now()}@test.local`, name: 'Owner' } })
    company = await prisma.company.create({ data: { name: `TestCo ${Date.now()}`, ownerId: owner.id } })

    // create a job
    job = await prisma.job.create({ data: { title: 'Senior Engineer', description: 'Building services', companyId: company.id, location: 'Remote' } })

    // create a candidate user and a rule that should match
    user = await prisma.user.create({ data: { email: `candidate+${Date.now()}@test.local`, name: 'Candidate' } })
    // Prisma Postgres schema expects string arrays for keywords/locations; SQLite schema may accept strings.
    const isPostgres = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'))
    const keywordsVal: any = isPostgres ? ['engineer', 'services'] : 'engineer,services'
    const locationsVal: any = isPostgres ? ['remote'] : 'remote'
    rule = await prisma.autoApplyRule.create({ data: { userId: user.id, keywords: keywordsVal, locations: locationsVal, active: true } })
  })

  afterAll(async () => {
    // clean up created records
    await prisma.application.deleteMany({ where: { jobId: job.id } })
    await prisma.autoApplyRule.deleteMany({ where: { userId: user.id } })
    await prisma.job.deleteMany({ where: { id: job.id } })
    await prisma.company.deleteMany({ where: { id: company.id } })
    await prisma.user.deleteMany({ where: { id: user.id } })
    await prisma.user.deleteMany({ where: { id: owner.id } })
    await prisma.$disconnect()
  })

  it('creates an application when rule matches job', async () => {
    const res = await processor({ data: { jobId: job.id } })
    expect(res.ok).toBe(true)
    // confirm application created
    const application = await prisma.application.findFirst({ where: { jobId: job.id, userId: user.id } })
    expect(application).toBeTruthy()
    expect(application?.source).toBe('autoapply')
  })
})
