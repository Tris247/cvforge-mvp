/**
 * scripts/migrate-json-to-postgres.js
 *
 * Purpose: pragmatic helper to copy demo/test rows from `data/*.json`
 * into a Postgres database using the generated Prisma Postgres client.
 *
 * Usage examples:
 *   node scripts/migrate-json-to-postgres.js --dry-run
 *   node scripts/migrate-json-to-postgres.js --force --batch-size=100
 *
 * Safety:
 * - By default runs in dry-run mode. Pass `--force` to enable writes.
 * - Uses chunked transactions and records progress in `.migrate-json-state.json`.
 */

const fs = require('fs')
const path = require('path')

function parseArg(name, defaultValue) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`))
  if (arg) return arg.split('=')[1]
  return defaultValue
}

const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1'
const force = process.argv.includes('--force') || process.env.CONFIRM_MIGRATE === '1'
const batchSize = parseInt(parseArg('batch-size', '50'), 10)
const statePath = process.env.MIGRATE_JSON_STATE || path.join(process.cwd(), '.migrate-json-state.json')

let state = { tableProgress: {} }
if (fs.existsSync(statePath)) {
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')) } catch (e) { console.warn('failed to parse state file, starting fresh', e.message) }
}

function saveState() {
  try { fs.writeFileSync(statePath, JSON.stringify(state, null, 2)) } catch (e) { console.warn('Failed to write state file', e.message) }
}

function loadJsonIfExists(nameCandidates) {
  for (const name of nameCandidates) {
    const p = path.join(process.cwd(), 'data', name)
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { console.warn('Failed to parse', p, e.message); return [] }
    }
  }
  return []
}

async function main() {
  let prisma
  if (!dryRun) {
    try { const { PrismaClient } = require('@prisma/client'); prisma = new PrismaClient() } catch (e) { console.error('Missing @prisma/client — run `npx prisma generate --schema=prisma/schema.postgres.prisma` first'); process.exit(1) }
  } else {
    console.log('Dry-run: skipping Prisma client load (no DB writes)')
  }

  // Candidate filenames
  const users = loadJsonIfExists(['users.json', 'user.json'])
  const companies = loadJsonIfExists(['companies.json', 'company.json'])
  const jobs = loadJsonIfExists(['jobs.json', 'job.json'])
  const cvs = loadJsonIfExists(['cvs.json', 'cv.json'])
  const rules = loadJsonIfExists(['autoApplyRules.json', 'autoapplyrules.json', 'rules.json'])
  const subs = loadJsonIfExists(['subscriptions.json', 'subscription.json'])
  // marketplace application files: may be multiple test files with prefixes
  const marketplaceAppFiles = fs.readdirSync(path.join(process.cwd(), 'data')).filter(f => f.startsWith('marketplace-applications'))
  let marketplaceApplications = []
  for (const f of marketplaceAppFiles) {
    try {
      const p = path.join(process.cwd(), 'data', f)
      const obj = JSON.parse(fs.readFileSync(p, 'utf8'))
      if (Array.isArray(obj)) marketplaceApplications = marketplaceApplications.concat(obj)
    } catch (e) { /* ignore parse errors per-file */ }
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
        let data = mapRowToData(r)
        // remove keys with null or undefined to avoid creating relations with nulls
        if (data && typeof data === 'object') {
          data = Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== null && v !== undefined))
        }
        if (!data) continue
        try {
          if (dryRun) { console.log('[dry-run]', tableKey, 'would upsert', data.id ? `(id=${data.id})` : JSON.stringify(data)); continue }
          if (data.id) {
            // split create vs update to avoid sending nested connectOrCreate in update
            const createData = data
            const updateData = Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'user'))
            ops.push(prisma[upsertFnName].upsert({ where: { id: data.id }, update: updateData, create: createData }))
          } else {
            // naive fallback: try to create
            ops.push(prisma[upsertFnName].create({ data }))
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
    if (Array.isArray(users) && users.length) {
      await upsertChunks(users, (u) => ({ id: u.id, name: u.name || null, email: u.email || u.emailAddress || null, role: u.role || 'USER' }), 'user', 'user')
    }

    if (Array.isArray(companies) && companies.length) {
      await upsertChunks(companies, (c) => ({ id: c.id, name: c.name, description: c.description || null, ownerId: c.ownerId || c.owner_id || null }), 'company', 'company')
    }

    if (Array.isArray(jobs) && jobs.length) {
      await upsertChunks(jobs, (j) => ({ id: j.id, title: j.title || null, description: j.description || j.body || null, companyId: j.companyId || j.company_id || null, location: j.location || null, status: j.status || null, remote: j.remote || false }), 'job', 'job')
    }

    if (Array.isArray(cvs) && cvs.length) {
      await upsertChunks(cvs, (v) => ({ id: v.id, ownerId: v.ownerId || v.owner_id || null, title: v.title || null, path: v.path || null, content: v.content || null }), 'cv', 'cV')
    }

    if (Array.isArray(rules) && rules.length) {
      await upsertChunks(rules, (r) => ({ id: r.id, userId: r.userId || r.user_id || null, keywords: r.keywords || [], locations: r.locations || [], active: r.active !== undefined ? r.active : true }), 'autoApplyRule', 'autoApplyRule')
    }

    if (Array.isArray(subs) && subs.length) {
      await upsertChunks(subs, (s) => ({ id: s.id, userId: s.userId || s.user_id || null, tier: s.tier || null, active: s.active || false, stripeSubscriptionId: s.stripeSubscriptionId || s.stripe_subscription_id || null }), 'subscription', 'subscription')
    }

    // Marketplace applications
    if (Array.isArray(marketplaceApplications) && marketplaceApplications.length) {
      await upsertChunks(marketplaceApplications, (a) => {
        // Map marketplace application fields to Application model
        const jobId = a.itemId || a.jobId || null
        const userId = a.applicantId || a.userId || null
        // Skip applications that don't reference a job or user (required relations)
        if (!jobId || !userId) return null
        const mapped = {
          id: a.id ? String(a.id) : undefined,
          jobId,
          cvId: a.cvId || null,
          status: a.status || 'applied',
          source: 'marketplace',
          message: a.message || null,
          createdAt: a.createdAt ? new Date(a.createdAt) : undefined
        }
        // For creation, ensure the related user exists by using connectOrCreate
        // Prisma will accept nested relation in `create` but for `update` we'll set userId
        mapped.user = {
          connectOrCreate: {
            where: { id: String(userId) },
            create: { id: String(userId), email: `${String(userId)}@import.local` }
          }
        }
        // Also include userId for updates
        mapped.userId = String(userId)
        return mapped
      }, 'application', 'application')
    }

    console.log('JSON migration finished.')
  } finally {
    if (prisma) await prisma.$disconnect()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
