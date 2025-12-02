import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const { tier } = req.body || {}
  if(!tier) return res.status(400).json({ error: 'tier required' })

  const user = await getUserFromReq(req)
  if(!user) return res.status(401).json({ error: 'not authenticated' })

  // If Stripe isn't configured, return a demo response
  if(!process.env.STRIPE_SECRET) return res.status(200).json({ demo: true, message: 'Stripe not configured - demo checkout', tier })

  try{
    const Stripe = require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' })

    // persist a pending subscription record in our DB so webhook can link back
    const pending = await prisma.subscription.create({ data: { userId: user.id, tier, active: false, status: 'pending' } as any })

    // pick price id for tier if available
    const priceForTier = process.env[`STRIPE_PRICE_ID_${tier?.toUpperCase()}`] || process.env.STRIPE_PRICE_ID
    const trialDaysEnv = process.env[`STRIPE_TRIAL_DAYS_${tier?.toUpperCase()}`]
    const trialDays = trialDaysEnv ? parseInt(trialDaysEnv, 10) : undefined

    // This is a simple demo: in production create price IDs on Stripe dashboard
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceForTier || (process.env.STRIPE_PRICE_ID || 'price_dummy'), quantity: 1 }],
      success_url: process.env.SUCCESS_URL || 'http://localhost:3000/account/subscription',
      cancel_url: process.env.CANCEL_URL || 'http://localhost:3000/account/subscription',
      // include our local subscription id in metadata so webhook can find it
      metadata: { userId: user.id, tier, subscriptionId: pending.id },
      subscription_data: (trialDays ? { trial_period_days: trialDays } : undefined)
    })

    // persist stripe session id so we can correlate later if needed
    await prisma.subscription.update({ where: { id: pending.id }, data: { stripeSessionId: session.id, stripeCustomerId: session.customer || null } as any })

    try{ const { trackEvent } = require('../../../lib/analytics'); trackEvent('checkout.started', { userId: user.id, tier, subscriptionId: pending.id, sessionId: session.id }) }catch(e){}

    return res.status(200).json({ url: session.url })
  }catch(err){
    console.error('stripe checkout error', err)
    return res.status(500).json({ error: 'stripe failed' })
  }
}
