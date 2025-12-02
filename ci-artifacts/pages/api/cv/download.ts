import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import prisma from '../../../lib/prisma'
import { requireRole } from '../../../lib/authServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: 'Missing id' })

  // require authenticated user to download (any role allowed)
  const user = await requireRole(req, res, ['job_seeker','employer','admin'])
  if (!user) return null

  try {
    if (prisma && (prisma.cv as any)) {
      const cv = await prisma.cv.findUnique({ where: { id } as any })
      if (!cv) return res.status(404).json({ error: 'Not found' })
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).send(JSON.stringify({ cv }))
    }
  } catch (e) {
    console.warn('prisma cv read failed, falling back to file', e)
  }

  try {
    const cvsPath = path.join(process.cwd(), 'data', 'cvs.json')
    if (!fs.existsSync(cvsPath)) return res.status(404).json({ error: 'Not found' })
    const arr = JSON.parse(fs.readFileSync(cvsPath, 'utf8') || '[]')
    const cv = arr.find((c:any) => c.id === id)
    if (!cv) return res.status(404).json({ error: 'Not found' })
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).send(JSON.stringify({ cv }))
  } catch (e) {
    console.error('failed to read cvs file', e)
    return res.status(500).json({ error: 'failed to read cv' })
  }
}
