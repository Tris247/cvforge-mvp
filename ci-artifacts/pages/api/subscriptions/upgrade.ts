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

  // create pending record referencing current subscription
  const current = await prisma.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })

  if(!process.env.STRIPE_SECRET){
    // demo local: directly create or update
    if(current){
      const updated = await prisma.subscription.update({ where: { id: current.id }, data: { tier } })
      return res.status(200).json({ subscription: updated })
    }
    const created = await prisma.subscription.create({ data: { userId: user.id, tier, active: true, status: 'active' } as any })
    return res.status(200).json({ subscription: created })
  }

  try{
    const Stripe = require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' })

    // create a pending change so webhook can map it later
    const pending = await prisma.subscription.create({ data: { userId: user.id, tier, active: false, status: 'pending_change', stripeSubscriptionId: (current as any)?.stripeSubscriptionId || null } as any })

    // pick price id from environment mapping e.g. STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_STARTER
    const priceForTier = process.env[`STRIPE_PRICE_ID_${tier?.toUpperCase()}`] || process.env.STRIPE_PRICE_ID

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: priceForTier ? [{ price: priceForTier, quantity: 1 }] : [{ price: process.env.STRIPE_PRICE_ID || 'price_dummy', quantity: 1 }],
      success_url: process.env.SUCCESS_URL || 'http://localhost:3000/account/subscription',
      cancel_url: process.env.CANCEL_URL || 'http://localhost:3000/account/subscription',
      metadata: { userId: user.id, tier, subscriptionId: pending.id }
    })

    await prisma.subscription.update({ where: { id: pending.id }, data: { stripeSessionId: session.id } as any })

    return res.status(200).json({ url: session.url })
  }catch(err){ console.error('upgrade/create session failed', err); return res.status(500).json({ error: 'failed' }) }
}
