/**
 * scripts/migrate-sqlite-to-postgres.js
 *
 * Purpose: pragmatic helper to copy demo/test rows from a local SQLite Prisma dev DB
 * into a Postgres database using the Postgres Prisma client (generated from
 * `prisma/schema.postgres.prisma`).
 *
 * Usage examples (PowerShell):
 *   $env:SQLITE_DB = './dev.db'
 *   $env:DATABASE_URL = 'postgresql://postgres:pass@localhost:5432/cvforge_dev'
 *   node scripts/migrate-sqlite-to-postgres.js --dry-run
 *   node scripts/migrate-sqlite-to-postgres.js --batch-size=100 --force
 *   node scripts/migrate-sqlite-to-postgres.js --resume --force
 *
 * Notes:
 * - This is intended for small demo/test datasets. Review mappings before
 *   running against production data.
 * - Generate the Postgres Prisma client first:
 *     npx prisma generate --schema=prisma/schema.postgres.prisma
 */

const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

function parseArg(name, defaultValue) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`))
  if (arg) return arg.split('=')[1]
  return defaultValue
}

async function openSqlite(dbPath) {
  return open({ filename: dbPath, driver: sqlite3.Database })
}

async function main() {
  const sqlitePath = process.env.SQLITE_DB || path.join(process.cwd(), 'dev.db')
  const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1'
  const force = process.argv.includes('--force') || process.env.CONFIRM_MIGRATE === '1'
  const batchSize = parseInt(parseArg('batch-size', '50'), 10)
  const limit = parseArg('limit', undefined) ? parseInt(parseArg('limit', undefined), 10) : undefined
  const skip = parseInt(parseArg('skip', '0'), 10)
  const resume = process.argv.includes('--resume') || process.env.MIGRATE_RESUME === '1'
  const statePath = process.env.MIGRATE_STATE || path.join(process.cwd(), '.migrate-state.json')

  let state = { tableProgress: {} }
  if (resume && fs.existsSync(statePath)) {
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')) } catch (e) { console.warn('Failed to parse state file, starting fresh:', e.message) }
    console.log('Resuming migration from state file:', statePath)
  } else if (fs.existsSync(statePath) && !resume) {
    console.warn('State file exists:', statePath, "— pass --resume to continue or remove it to start fresh")
  }

  if (!fs.existsSync(sqlitePath)) {
    console.error('SQLite DB not found at', sqlitePath)
    process.exit(1)
  }

  let prisma
  try {
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  } catch (e) {
    console.error('Missing @prisma/client — run `npx prisma generate --schema=prisma/schema.postgres.prisma` first')
    console.error(e.message)
    process.exit(1)
  }

  const sqlite = await openSqlite(sqlitePath)
  console.log('Opened SQLite DB at', sqlitePath)

  function saveState() {
    try { fs.writeFileSync(statePath, JSON.stringify(state, null, 2)) } catch (e) { console.warn('Failed to write state file', e.message) }
  }

  function normalizeArray(val){
    if(!val) return []
    if(Array.isArray(val)) return val.filter(Boolean)
    if(typeof val === 'string') return val.split(/[,;|\n]+/).map(s=>s.trim()).filter(Boolean)
    return []
  }

  function normalizeBoolean(v, fallback=null){
    if(v === undefined || v === null) return fallback
    if(typeof v === 'boolean') return v
    if(typeof v === 'number') return v === 1
    if(typeof v === 'string') return ['1','true','yes'].includes(v.toLowerCase())
    return fallback
  }

  function stripNulls(obj){
    const out = {}
    for(const k of Object.keys(obj)){
      const v = obj[k]
      if(v === undefined) continue
      // keep explicit nulls for nullable fields
      out[k] = v
    }
    return out
  }

  async function resolveExisting(table, data) {
    try {
      switch (table) {
        case 'user':
          if (data.email) return prisma.user.findUnique({ where: { email: data.email } })
          break
        case 'company':
          if (data.id) return prisma.company.findUnique({ where: { id: data.id } })
          if (data.name) return prisma.company.findFirst({ where: { name: data.name } })
          break
        case 'job':
          if (data.id) return prisma.job.findUnique({ where: { id: data.id } })
          if (data.title && data.companyId) return prisma.job.findFirst({ where: { title: data.title, companyId: data.companyId } })
          break
        case 'cv':
          if (data.id) return prisma.cV.findUnique({ where: { id: data.id } })
          if (data.ownerId && data.title) return prisma.cV.findFirst({ where: { ownerId: data.ownerId, title: data.title } })
          break
        case 'autoApplyRule':
          if (data.id) return prisma.autoApplyRule.findUnique({ where: { id: data.id } })
          if (data.userId) return prisma.autoApplyRule.findFirst({ where: { userId: data.userId } })
          break
        case 'subscription':
          if (data.id) return prisma.subscription.findUnique({ where: { id: data.id } })
          if (data.userId && data.tier) return prisma.subscription.findFirst({ where: { userId: data.userId, tier: data.tier } })
          break
        default:
          return null
      }
    } catch (e) {
      console.warn('resolveExisting error', table, e.message)
    }
    return null
  }

  async function upsertChunks(rows, mapRowToData, tableKey, upsertFnName) {
    const processed = state.tableProgress[tableKey] || 0
    const toProcess = rows.slice(processed)
    if (!toProcess.length) return

    console.log(`Processing ${toProcess.length} ${tableKey} rows in batches of ${batchSize} (already processed ${processed})`)

    for (let i = 0; i < toProcess.length; i += batchSize) {
      const chunk = toProcess.slice(i, i + batchSize)
      const ops = []

      for (const r of chunk) {
        const data = mapRowToData(r)
        if (!data) continue

        // prefer deterministic upsert by unique key if available
        try {
          if (dryRun) {
            console.log('[dry-run]', tableKey, 'would upsert', data.id ? `(id=${data.id})` : JSON.stringify(data))
            continue
          }

          // build an upsert operation depending on available unique keys
          if (data.id) {
            ops.push(prisma[upsertFnName].upsert({ where: { id: data.id }, update: data, create: data }))
          } else {
            const existing = await resolveExisting(tableKey, data)
            if (existing && existing.id) {
              ops.push(prisma[upsertFnName].update({ where: { id: existing.id }, data }))
            } else {
              ops.push(prisma[upsertFnName].create({ data }))
            }
          }
        } catch (e) {
          console.warn(`Preparing op for ${tableKey} failed:`, e.message)
        }
      }

      try {
        if (!dryRun) {
          if (!force) throw new Error('Writes disabled: pass --force or set CONFIRM_MIGRATE=1 to enable')
          await prisma.$transaction(ops)
          state.tableProgress[tableKey] = (state.tableProgress[tableKey] || 0) + chunk.length
          saveState()
          console.log(`Upserted ${chunk.length} ${tableKey} rows`)
        }
      } catch (e) {
        console.warn(`Transaction failed for ${tableKey} chunk:`, e.message)
      }
    }
  }

  try {
    // USERS
    let users = []
    try { users = await sqlite.all('SELECT * FROM "User"') } catch (e) { users = [] }
    if (Array.isArray(users) && users.length) {
      await upsertChunks(users, (u) => {
        const email = u.email || u.email_address || u.emailAddress
        if (!email) return null
        return stripNulls({
          id: u.id,
          name: u.name || u.displayName || null,
          email: email,
          role: u.role || 'USER',
          createdAt: u.createdAt || u.created_at || undefined,
          updatedAt: u.updatedAt || u.updated_at || undefined
        })
      }, 'user', 'user')
    }

    // COMPANIES
    let companies = []
    try { companies = await sqlite.all('SELECT * FROM "Company"') } catch (e) { companies = [] }
    if (Array.isArray(companies) && companies.length) {
      await upsertChunks(companies, (c) => stripNulls({ id: c.id, name: c.name, description: c.description || null, ownerId: c.ownerId || c.owner_id || null }), 'company', 'company')
    }

    // JOBS
    let jobs = []
    try { jobs = await sqlite.all('SELECT * FROM "Job"') } catch (e) { jobs = [] }
    if (Array.isArray(jobs) && jobs.length) {
      await upsertChunks(jobs, (j) => {
        const companyId = j.companyId || j.company_id || null
        const parsedMeta = j.metadata ? (() => { try { return JSON.parse(j.metadata) } catch { return null } })() : null
        return stripNulls({
          id: j.id,
          title: j.title || null,
          description: j.description || j.body || null,
          companyId,
          location: j.location || null,
          status: j.status || null,
          remote: normalizeBoolean(j.remote, false),
          metadata: parsedMeta,
          tags: normalizeArray(j.tags),
          jobType: j.jobType || j.job_type || null
        })
      }, 'job', 'job')
    }

    // CVs
    let cvs = []
    try { cvs = await sqlite.all('SELECT * FROM "CV"') } catch (e) { try { cvs = await sqlite.all('SELECT * FROM "cV"') } catch (_) { cvs = [] } }
    if (Array.isArray(cvs) && cvs.length) {
      await upsertChunks(cvs, (v) => ({ id: v.id, ownerId: v.ownerId || v.owner_id || null, title: v.title || null, path: v.path || null, content: v.content || null }), 'cv', 'cV')
    }

    // AUTO APPLY RULES
    let rules = []
    try { rules = await sqlite.all('SELECT * FROM "AutoApplyRule"') } catch (e) { rules = [] }
    if (Array.isArray(rules) && rules.length) {
      await upsertChunks(rules, (r) => {
        const keywords = normalizeArray(r.keywords)
        const locations = normalizeArray(r.locations)
        const jobTypes = normalizeArray(r.jobTypes)
        return stripNulls({
          id: r.id,
          userId: r.userId || r.user_id || null,
          keywords,
          locations,
          salaryMin: r.salaryMin || r.salary_min || null,
          jobTypes,
          active: normalizeBoolean(r.active, true),
          remoteOnly: normalizeBoolean(r.remoteOnly, null)
        })
      }, 'autoApplyRule', 'autoApplyRule')
    }

    // SUBSCRIPTIONS
    let subs = []
    try { subs = await sqlite.all('SELECT * FROM "Subscription"') } catch (e) { subs = [] }
    if (Array.isArray(subs) && subs.length) {
      await upsertChunks(subs, (s) => stripNulls({ id: s.id, userId: s.userId || s.user_id || null, tier: s.tier || null, active: normalizeBoolean(s.active, false), stripeSubscriptionId: s.stripeSubscriptionId || s.stripe_subscription_id || null, metadata: s.metadata ? (() => { try { return JSON.parse(s.metadata) } catch { return null } })() : null }), 'subscription', 'subscription')
    }

    // APPLICATIONS (optional - copy basic fields if table exists)
    let apps = []
    try { apps = await sqlite.all('SELECT * FROM "Application"') } catch (e) { apps = [] }
    if (Array.isArray(apps) && apps.length) {
      await upsertChunks(apps, (a) => stripNulls({ id: a.id, userId: a.userId || a.user_id || null, jobId: a.jobId || a.job_id || null, cvId: a.cvId || a.cv_id || null, status: a.status || undefined, autoApplied: normalizeBoolean(a.autoApplied, false), source: a.source || null, message: a.message || null, metadata: a.metadata ? (() => { try { return JSON.parse(a.metadata) } catch { return null } })() : null }), 'application', 'application')
    }

    console.log('Migration finished. Inspect Postgres DB to verify imported rows.')
  } finally {
    await sqlite.close()
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error(e); process.exit(1) })

