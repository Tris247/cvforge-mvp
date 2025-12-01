/**
 * prisma/seed-postgres.js
 *
 * Usage: set `DATABASE_URL` to your Postgres DB and run:
 *   node prisma/seed-postgres.js
 *
 * This script is intentionally minimal: it imports small demo datasets from `data/*.json`
 * and writes them to a Prisma-backed Postgres DB using the `prisma/schema.postgres.prisma`
 * (ensure you ran `npx prisma generate --schema=prisma/schema.postgres.prisma`).
 *
 * It is NOT a full migration tool. For complex datasets consider writing a bespoke
 * migration that iterates source rows and converts shapes carefully.
 */

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

async function readJsonIfExists(relPath) {
  const p = path.join(process.cwd(), relPath)
  if (!fs.existsSync(p)) return null
  try {
    const raw = fs.readFileSync(p, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('failed to parse', relPath, e)
    return null
  }
}

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('Reading data from data/*.json if present...')
    const jobs = await readJsonIfExists('data/jobs.json')
    const cvs = await readJsonIfExists('data/cvs.json')
    const users = await readJsonIfExists('data/users.json')

    // Import users first (if present)
    if (Array.isArray(users)) {
      for (const u of users) {
        try {
          await prisma.user.upsert({ where: { email: u.email }, update: u, create: u })
        } catch (e) {
          console.warn('failed to upsert user', u.email, e.message)
        }
      }
    }

    // Companies: if jobs included company info, create minimal company rows
    if (Array.isArray(jobs)) {
      for (const j of jobs) {
        if (j.company) {
          const c = j.company
          try {
            await prisma.company.upsert({ where: { name: c.name }, update: c, create: c })
          } catch (e) {
            console.warn('failed to upsert company', c.name, e.message)
          }
        }
      }
    }

    // Jobs
    if (Array.isArray(jobs)) {
      for (const j of jobs) {
        const data = Object.assign({}, j)
        delete data.company
        try {
          await prisma.job.upsert({ where: { id: j.id || '' }, update: data, create: data })
        } catch (e) {
          // fallback: create without id
          try {
            await prisma.job.create({ data })
          } catch (er) {
            console.warn('failed to import job', j.title, er.message)
          }
        }
      }
    }

    // CVs
    if (Array.isArray(cvs)) {
      for (const v of cvs) {
        try {
          await prisma.cV.upsert({ where: { id: v.id }, update: v, create: v })
        } catch (e) {
          try {
            await prisma.cv.upsert({ where: { id: v.id }, update: v, create: v })
          } catch (er) {
            console.warn('failed to import cv', v.id, er.message)
          }
        }
      }
    }

    console.log('Seed complete (minimal). Please review imported rows in your Postgres DB.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
