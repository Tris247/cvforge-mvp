import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma: any = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const user = await getUserFromReq(req)
  if(!user || user.role !== 'admin') return res.status(403).json({ error: 'forbidden' })

  if(!process.env.STRIPE_SECRET) return res.status(400).json({ error: 'stripe not configured' })

  try{
    // run a quick reconcile pass similar to scripts/stripe-reconcile.js
    const Stripe = require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' })

    const subs = await prisma.subscription.findMany({ where: { stripeSubscriptionId: { not: null } } as any })
    for(const s of subs){
      try{
        const det = await stripe.subscriptions.retrieve((s as any).stripeSubscriptionId)
        await prisma.subscription.update({ where: { id: s.id }, data: { status: det.status || null, active: det.status === 'active', stripePriceId: det.items?.data?.[0]?.price?.id || null, trialEnd: det.trial_end ? new Date(det.trial_end * 1000) : null, currentPeriodStart: det.current_period_start ? new Date(det.current_period_start*1000) : null, currentPeriodEnd: det.current_period_end ? new Date(det.current_period_end*1000) : null, cancelAtPeriodEnd: !!det.cancel_at_period_end, cancelAt: det.cancel_at ? new Date(det.cancel_at*1000) : null, stripeCustomerId: det.customer || null } as any })
      }catch(e){ console.warn('Failed to fetch subscription', s.id, (e instanceof Error) ? e.message : String(e)) }
    }

    // fetch invoices for customers in subscriptions and upsert into DB
    const customers = await (prisma as any).subscription.findMany({ where: { stripeCustomerId: { not: null } }, select: { stripeCustomerId: true } })
    for(const c of customers){
      try{
        const invoices = await stripe.invoices.list({ customer: (c as any).stripeCustomerId, limit: 50 })
        for(const inv of invoices.data){
          await prisma.invoice.upsert({ where: { stripeInvoiceId: inv.id }, create: { stripeInvoiceId: inv.id, customerId: (c as any).stripeCustomerId, amountDue: inv.amount_due || null, currency: inv.currency || null, status: inv.status || null, hostedInvoiceUrl: inv.hosted_invoice_url || null, invoicePdf: inv.invoice_pdf || null, periodStart: inv.period_start ? new Date(inv.period_start*1000) : null, periodEnd: inv.period_end ? new Date(inv.period_end*1000) : null } as any, update: { amountDue: inv.amount_due || null, status: inv.status || null, hostedInvoiceUrl: inv.hosted_invoice_url || null, invoicePdf: inv.invoice_pdf || null } as any })
        }
      }catch(e){ console.warn('Failed to fetch invoices for customer', c, (e instanceof Error) ? e.message : String(e)) }
    }

    return res.status(200).json({ ok: true, reconciled: subs.length })
  }catch(err){ console.error('reconcile failed', err); return res.status(500).json({ error: 'failed' }) }
}
