import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma: any = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const user = await getUserFromReq(req)
  if(!user) return res.status(401).json({ error: 'not authenticated' })

  const invoiceId = (req.query.invoiceId || req.body?.invoiceId || '') as string
  if(!invoiceId) return res.status(400).json({ error: 'invoice id required' })

  try{
    // find invoice in DB to verify ownership
    const inv = await prisma.invoice.findUnique({ where: { stripeInvoiceId: invoiceId } })
    if(!inv) return res.status(404).json({ error: 'invoice not found' })

    // ensure user owns the subscription/invoice
    if(inv.subscriptionId){
      const sub = await prisma.subscription.findUnique({ where: { id: inv.subscriptionId } })
      if(!sub || sub.userId !== user.id) return res.status(403).json({ error: 'forbidden' })
    }

    // If Stripe configured and we have secret, attempt to proxy the invoice PDF from Stripe
    if(process.env.STRIPE_SECRET){
      try{
        const Stripe = require('stripe')
        const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' })
        // retrieve invoice to get hosted url / pdf
        const sInv = await stripe.invoices.retrieve(invoiceId)
        const pdf = sInv.invoice_pdf || sInv.hosted_invoice_url || null
        if(pdf && sInv.invoice_pdf){
          // proxy the pdf bytes
          const response = await stripe.request({ method: 'GET', url: sInv.invoice_pdf })
          const buf = await response.arrayBuffer()
          res.setHeader('content-type', 'application/pdf')
          return res.status(200).send(Buffer.from(buf))
        }
        // otherwise redirect to hosted url
        if(pdf) return res.status(302).setHeader('Location', pdf).end()
      }catch(err){
        console.warn('stripe invoice fetch failed', err)
        // fallthrough to DB-hosted fallback
      }
    }

    // Fallback: return invoicePdf or hostedInvoiceUrl stored in DB
    if(inv.invoicePdf) return res.status(302).setHeader('Location', inv.invoicePdf).end()
    if(inv.hostedInvoiceUrl) return res.status(302).setHeader('Location', inv.hostedInvoiceUrl).end()

    return res.status(404).json({ error: 'no invoice PDF or URL available' })
  }catch(err){
    console.error('invoice download error', err)
    return res.status(500).json({ error: 'failed' })
  }
}
