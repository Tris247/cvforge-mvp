const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
  console.log('Seeding demo data...')
  const user = await prisma.user.upsert({ where: { email: 'demo@cvforge.local' }, update: {}, create: { email: 'demo@cvforge.local', name: 'Demo User' } })

  const cv = await prisma.cV.upsert({ where: { id: 'cv-demo-1' }, update: { content: 'Updated' }, create: { id: 'cv-demo-1', title: 'Full Stack Developer', content: '• Built services\n• Led teams', ownerId: user.id } })

  const job = await prisma.job.create({ data: { title: 'Frontend Developer', company: 'CapeTech', location: 'Cape Town, South Africa', description: 'Work on React & Next.js apps', tags: 'remote,frontend' } })

  await prisma.application.create({ data: { jobId: job.id, cvId: cv.id, applicantName: user.name, status: 'applied' } })

  await prisma.subscription.create({ data: { userId: user.id, tier: 'free', active: true } })

  // Add a paid demo user with a Stripe-like subscription + invoice so subscription flows can be tested
  const paid = await prisma.user.upsert({ where: { email: 'paid@cvforge.local' }, update: {}, create: { email: 'paid@cvforge.local', name: 'Paid Demo' } })
  const paidCv = await prisma.cV.upsert({ where: { id: 'cv-paid-1' }, update: { content: 'Updated' }, create: { id: 'cv-paid-1', title: 'Senior Engineer', content: '• Architected backend\n• Mentored engineers', ownerId: paid.id } })

  const paidSub = await prisma.subscription.create({ data: { userId: paid.id, tier: 'pro', active: true, stripeSubscriptionId: 'sub_demo_1', stripePriceId: 'price_demo_pro', status: 'active' } })

  // create an invoice record associated to the paid subscription
  await prisma.invoice.create({ data: { stripeInvoiceId: 'in_demo_1', subscriptionId: paidSub.id, customerId: 'cus_demo_1', amountDue: 1500, currency: 'usd', status: 'paid', hostedInvoiceUrl: 'https://stripe.test/i/1', invoicePdf: 'https://stripe.test/pdf/1' } })

  // Create a small stripe event audit log row as example
  await prisma.stripeEvent.create({ data: { eventId: 'evt_demo_1', type: 'invoice.created', payload: JSON.stringify({ demo: true, invoice: 'in_demo_1' }) } })

  // Marketplace demo data
  const item = await prisma.marketplaceItem.create({ data: { ownerId: user.id, title: 'Logo Design', description: 'Simple logo for startup', price: 50, company: 'DemoCo' } })
  await prisma.marketplaceApplication.create({ data: { itemId: item.id, applicantName: paid.name || 'Paid Demo', status: 'pending', message: 'I can do this quickly' } })

  console.log('Seeding finished')
}

main()
  .catch((e)=>{ console.error(e); process.exit(1) })
  .finally(async ()=>{ await prisma.$disconnect() })
