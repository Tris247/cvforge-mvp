import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (prisma && (prisma.cv as any)) {
      const cvs = await prisma.cv.findMany({ orderBy: { createdAt: 'desc' } as any })
      return res.status(200).json({ cvs })
    }
  } catch (e) {
    console.warn('prisma cv list failed, falling back to file', e)
  }

  try {
    const cvsPath = path.join(process.cwd(), 'data', 'cvs.json')
    if (!fs.existsSync(cvsPath)) return res.status(200).json({ cvs: [] })
    const arr = JSON.parse(fs.readFileSync(cvsPath, 'utf8') || '[]')
    return res.status(200).json({ cvs: arr })
  } catch (e) {
    console.error('failed to read cvs file', e)
    return res.status(500).json({ error: 'failed to read cvs' })
  }
}
import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(_req: NextApiRequest, res: NextApiResponse){
  try{
    const cvs = await prisma.cV.findMany({ orderBy: { createdAt: 'desc' } })
    res.status(200).json({ cvs })
  }catch(err){
    console.error('cv list error', err)
    res.status(500).json({ error: 'failed to list' })
  }
}
