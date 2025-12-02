// Reconcile Stripe subscriptions and invoices into the Prisma DB
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
  if(!process.env.STRIPE_SECRET) return console.error('STRIPE_SECRET required')
  const Stripe = require('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' })

  console.log('Fetching subscriptions from DB to reconcile...')
  const subs = await prisma.subscription.findMany({ where: { stripeSubscriptionId: { not: null } } })
  for(const s of subs){
    try{
      const det = await stripe.subscriptions.retrieve(s.stripeSubscriptionId)
      console.log('Reconcile', s.id, det.id, det.status)
      await prisma.subscription.update({ where: { id: s.id }, data: { status: det.status || null, active: det.status === 'active', stripePriceId: det.items?.data?.[0]?.price?.id || null, trialEnd: det.trial_end ? new Date(det.trial_end * 1000) : null, currentPeriodStart: det.current_period_start ? new Date(det.current_period_start*1000) : null, currentPeriodEnd: det.current_period_end ? new Date(det.current_period_end*1000) : null, cancelAtPeriodEnd: !!det.cancel_at_period_end, cancelAt: det.cancel_at ? new Date(det.cancel_at*1000) : null, stripeCustomerId: det.customer || null } })
    }catch(e){ console.warn('Failed to fetch subscription', s.id, e.message || e) }
  }

  // fetch recent invoices for customers in subscriptions
  const customers = await prisma.subscription.findMany({ where: { stripeCustomerId: { not: null } }, select: { stripeCustomerId: true } })
  for(const c of customers){
    try{
      const invoices = await stripe.invoices.list({ customer: c.stripeCustomerId, limit: 20 })
      for(const inv of invoices.data){
        // upsert invoice
        await prisma.invoice.upsert({ where: { stripeInvoiceId: inv.id }, create: { stripeInvoiceId: inv.id, customerId: c.stripeCustomerId, amountDue: inv.amount_due || null, currency: inv.currency || null, status: inv.status || null, hostedInvoiceUrl: inv.hosted_invoice_url || null, invoicePdf: inv.invoice_pdf || null, periodStart: inv.period_start ? new Date(inv.period_start*1000) : null, periodEnd: inv.period_end ? new Date(inv.period_end*1000) : null }, update: { amountDue: inv.amount_due || null, status: inv.status || null } })
      }
    }catch(e){ console.warn('Failed to fetch invoices for customer', c, e.message || e) }
  }

  console.log('Reconcile finished')
  await prisma.$disconnect()
}

main().catch(err=>{ console.error(err); prisma.$disconnect() })
