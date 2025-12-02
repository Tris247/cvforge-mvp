import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const user = await getUserFromReq(req)
  if(!user) return res.status(401).json({ error: 'not authenticated' })

  try{
    // find latest active subscription for user
    const sub = await prisma.subscription.findFirst({ where: { userId: user.id, active: true }, orderBy: { createdAt: 'desc' } })
    if(!sub) return res.status(404).json({ error: 'no active subscription found' })

    // if stripe is configured and there's a stripeSubscriptionId, cancel on Stripe
    if(process.env.STRIPE_SECRET && (sub as any).stripeSubscriptionId){
      try{
        const Stripe = require('stripe')
        const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' })
        await stripe.subscriptions.del((sub as any).stripeSubscriptionId)
      }catch(err){
        console.error('stripe cancel failed', err)
        // continue to mark local subscription inactive even if stripe fail
      }
    }

    const updated = await prisma.subscription.update({ where: { id: sub.id }, data: { active: false, status: 'cancelled' } as any })
    return res.status(200).json({ subscription: updated })
  }catch(err){
    console.error('cancel subscription failed', err)
    return res.status(500).json({ error: 'failed' })
  }
}
