import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const user = await getUserFromReq(req)
  if(!user) return res.status(401).json({ error: 'not authenticated' })

  if(!process.env.STRIPE_SECRET) return res.status(400).json({ error: 'stripe not configured' })

  try{
    const Stripe = require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' })

    const sub = await prisma.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    let customerId = (sub as any)?.stripeCustomerId || null
    if(!customerId){
      // create a customer for user
      const c = await stripe.customers.create({ email: user.email, name: user.name })
      customerId = c.id
      if(sub) await prisma.subscription.update({ where: { id: sub.id }, data: { stripeCustomerId: customerId } as any })
    }

    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: process.env.SUCCESS_URL || 'http://localhost:3000/account/subscription' })
    return res.status(200).json({ url: session.url })
  }catch(err){ console.error('create portal failed', err); return res.status(500).json({ error: 'failed' }) }
}
