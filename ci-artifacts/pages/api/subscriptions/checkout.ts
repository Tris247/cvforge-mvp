import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const user = await getUserFromReq(req)
  if(!user) return res.status(401).json({ error: 'not authenticated' })

  const { tier } = req.body || {}
  if(!tier) return res.status(400).json({ error: 'tier required' })

  // If Stripe isn't configured, create subscription directly in DB as demo
  if(!process.env.STRIPE_SECRET) {
    try{
      const sub = await prisma.subscription.create({ data: { userId: user.id, tier, active: true } })
      return res.status(200).json({ demo: true, subscription: sub })
    }catch(err){
      console.error('create subscription db error', err)
      return res.status(500).json({ error: 'failed to create' })
    }
  }

  // For real Stripe flow, delegate to checkout session route (client will call that), but keep safety
  return res.status(200).json({ ok: true, note: 'Stripe configured — create checkout via /api/stripe/create-checkout-session' })
}
