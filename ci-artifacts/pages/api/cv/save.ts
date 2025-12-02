import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  try{
    const { title, content, ownerId } = req.body || {}

    let owner = ownerId
    if(!owner){
      // fallback demo user
      const user = await prisma.user.findUnique({ where: { email: 'demo@cvforge.local' } })
      if(user) owner = user.id
    }

    const saved = await prisma.cV.create({ data: { title: title || 'My CV', content: content || '', ownerId: owner || '' } })
    try{ const { trackEvent } = require('../../../lib/analytics'); trackEvent('cv.save', { userId: owner || null, cvId: saved.id }) }catch(e){}
    return res.status(200).json(saved)
  }catch(e){ console.error('save cv error', e); return res.status(500).json({ error: 'save failed' }) }
}
