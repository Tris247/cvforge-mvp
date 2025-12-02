import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const user = await getUserFromReq(req)
  if(!user) return res.status(401).json({ error: 'not authenticated' })

  try{
    // find latest subscription that is not active
    const sub = await prisma.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    if(!sub) return res.status(404).json({ error: 'no subscription found' })

    // If stripe subscription id present and stripe configured, attempt to reactivate
    if(process.env.STRIPE_SECRET && (sub as any).stripeSubscriptionId){
      try{
        const Stripe = require('stripe')
        const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' })
        // attempt to clear cancel_at_period_end
        await stripe.subscriptions.update((sub as any).stripeSubscriptionId, { cancel_at_period_end: false })
      }catch(err){
        console.error('stripe reactivation failed', err)
      }
    }

    const updated = await prisma.subscription.update({ where: { id: sub.id }, data: { active: true, status: 'active', cancelAtPeriodEnd: false, cancelAt: null } as any })
    return res.status(200).json({ subscription: updated })
  }catch(err){
    console.error('reactivate failed', err)
    return res.status(500).json({ error: 'failed' })
  }
}
