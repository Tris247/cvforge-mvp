import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  try{
    const { email, name, referralCode } = req.body || {}
    if(!email) return res.status(400).json({ error: 'email required' })

    // prevent duplicate
    const existing = await prisma.user.findUnique({ where: { email } })
    if(existing) return res.status(409).json({ error: 'user exists' })

    const created = await prisma.user.create({ data: { email, name: name || null } })

    // apply referral if provided
    if(referralCode){
      try{ const { claimReferral } = require('../../../lib/referrals'); claimReferral(referralCode, created.id) }catch(e){}
    }

    try{ const { trackEvent } = require('../../../lib/analytics'); trackEvent('user.signup', { userId: created.id, email }) }catch(e){}

    return res.status(201).json({ user: { id: created.id, email: created.email, name: created.name } })
  }catch(e){ console.error('signup failed', e); return res.status(500).json({ error: 'signup failed' }) }
}
