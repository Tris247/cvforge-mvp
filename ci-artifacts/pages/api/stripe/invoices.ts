import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma: any = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const user = await getUserFromReq(req)
  if(!user) return res.status(401).json({ error: 'not authenticated' })

  // if stripe configured, fetch recent invoices for customer's id
  try{
    const sub = await prisma.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    if((sub as any)?.stripeCustomerId && process.env.STRIPE_SECRET){
      const Stripe = require('stripe')
      const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' })
      const invoices = await stripe.invoices.list({ customer: (sub as any).stripeCustomerId, limit: 50 })
      return res.status(200).json({ invoices: invoices.data })
    }

    // fallback: return DB invoices
    const invoices = await prisma.invoice.findMany({ where: { customerId: (sub as any)?.stripeCustomerId || undefined }, orderBy: { createdAt: 'desc' } })
    return res.status(200).json({ invoices })
  }catch(err){ console.error('invoices fetch failed', err); return res.status(500).json({ error: 'failed' }) }
}
