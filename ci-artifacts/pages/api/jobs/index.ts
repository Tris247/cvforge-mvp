import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import prisma from '../../../lib/prisma'
import { withValidation } from '../../../lib/validation'
import { requireRole } from '../../../lib/authServer'

const CreateJobSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1).optional(),
  location: z.string().optional(),
  description: z.string().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // prefer DB
      if (prisma && (prisma.job as any)) {
        const jobs = await prisma.job.findMany({ orderBy: { createdAt: 'desc' } as any })
        return res.status(200).json({ jobs })
      }
    } catch (e) {
      console.warn('prisma jobs read failed, falling back to file', e)
    }

    const jobsPath = path.join(process.cwd(), 'data', 'jobs.json')
    if (!fs.existsSync(jobsPath)) return res.status(200).json({ jobs: [] })
    try {
      const raw = fs.readFileSync(jobsPath, 'utf8') || '[]'
      const jobs = JSON.parse(raw)
      return res.status(200).json({ jobs })
    } catch (e) {
      console.error('failed to read jobs file', e)
      return res.status(500).json({ error: 'failed to read jobs' })
    }
  }

  if (req.method === 'POST') {
    // require employer role to create jobs
    const user = await requireRole(req, res, 'employer')
    if (!user) return null

    const body = req.body as any
    const parsed = CreateJobSchema.safeParse(body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid job payload' })

    const { title, companyName, location, description } = parsed.data
    try {
      if (prisma && (prisma.job as any)) {
        const job = await prisma.job.create({ data: { title, companyName, location, description, postedById: user.id } as any })
        return res.status(201).json({ job })
      }
    } catch (e) {
      console.warn('prisma job create failed, falling back to file', e)
    }

    try {
      const jobsPath = path.join(process.cwd(), 'data', 'jobs.json')
      let arr: any[] = []
      if (fs.existsSync(jobsPath)) arr = JSON.parse(fs.readFileSync(jobsPath, 'utf8') || '[]')
      const entry = { id: `file-${Date.now()}`, title, companyName, location, description, createdAt: new Date().toISOString(), postedById: user.id }
      arr.unshift(entry)
      fs.mkdirSync(path.dirname(jobsPath), { recursive: true })
      fs.writeFileSync(jobsPath, JSON.stringify(arr, null, 2))
      return res.status(201).json({ job: entry })
    } catch (e) {
      console.error('failed to write jobs file', e)
      return res.status(500).json({ error: 'failed to save job' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withValidation(CreateJobSchema, handler)
import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if(req.method === 'GET'){
      const jobs = await prisma.job.findMany({ orderBy: { createdAt: 'desc' } })
      return res.status(200).json({ jobs })
    }

    if(req.method === 'POST'){
      const { title, company, location, description, tags } = req.body || {}
      if(!title) return res.status(400).json({ error: 'missing title' })
      const job = await prisma.job.create({ data: { title, company, location, description, tags: tags || '' } })
      return res.status(200).json({ job })
    }

    res.status(405).json({ error: 'method not supported' })
  }catch(err){
    console.error('jobs api error', err)
    res.status(500).json({ error: 'server error' })
  }
}
