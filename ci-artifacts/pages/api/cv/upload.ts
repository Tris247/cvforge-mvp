import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import prisma from '../../../lib/prisma'
import { getUserFromReq, requireRole } from '../../../lib/authServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  // require job_seeker role to upload CV
  const user = await requireRole(req, res, 'job_seeker')
  if (!user) return null
  const userId = user.id
  const { title, content } = req.body || {}
  if (!title || !content) return res.status(400).json({ error: 'Missing title or content' })

  try {
    if (prisma && (prisma.cv as any)) {
      const cv = await prisma.cv.create({ data: { title, content, userId } as any })
      return res.status(201).json({ cv })
    }
  } catch (e) {
    console.warn('prisma cv create failed, falling back to file', e)
  }

  try {
    const cvsPath = path.join(process.cwd(), 'data', 'cvs.json')
    let arr: any[] = []
    if (fs.existsSync(cvsPath)) arr = JSON.parse(fs.readFileSync(cvsPath, 'utf8') || '[]')
    const entry = { id: `file-${Date.now()}`, title, content, userId, createdAt: new Date().toISOString() }
    arr.unshift(entry)
    fs.mkdirSync(path.dirname(cvsPath), { recursive: true })
    fs.writeFileSync(cvsPath, JSON.stringify(arr, null, 2))
    return res.status(201).json({ cv: entry })
  } catch (e) {
    console.error('failed to write cvs file', e)
    return res.status(500).json({ error: 'failed to save cv' })
  }
}
