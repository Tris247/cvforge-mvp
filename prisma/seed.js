const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
  console.log('Seeding demo data...')
  const user = await prisma.user.upsert({ where: { email: 'demo@cvforge.local' }, update: {}, create: { email: 'demo@cvforge.local', name: 'Demo User' } })

  const cv = await prisma.cV.upsert({ where: { id: 'cv-demo-1' }, update: { content: 'Updated' }, create: { id: 'cv-demo-1', title: 'Full Stack Developer', content: '• Built services\n• Led teams', ownerId: user.id } })

  // ensure a company exists and create a job referencing its id
  let company = await prisma.company.findFirst({ where: { name: 'CapeTech' } })
  if (!company) {
    company = await prisma.company.create({ data: { name: 'CapeTech', ownerId: user.id } })
  }

  const job = await prisma.job.create({ data: { title: 'Frontend Developer', companyId: company.id, location: 'Cape Town, South Africa', description: 'Work on React & Next.js apps', tags: 'remote,frontend' } })

  // create an application in the schema-compatible shape
  await prisma.application.create({ data: { jobId: job.id, userId: user.id, cvId: cv.id, status: 'applied', source: 'seed' } })

  await prisma.subscription.create({ data: { userId: user.id, tier: 'free', active: true } })

  // Add a paid demo user with a Stripe-like subscription + invoice so subscription flows can be tested
  const paid = await prisma.user.upsert({ where: { email: 'paid@cvforge.local' }, update: {}, create: { email: 'paid@cvforge.local', name: 'Paid Demo' } })
  const paidCv = await prisma.cV.upsert({ where: { id: 'cv-paid-1' }, update: { content: 'Updated' }, create: { id: 'cv-paid-1', title: 'Senior Engineer', content: '• Architected backend\n• Mentored engineers', ownerId: paid.id } })

  const paidSub = await prisma.subscription.create({ data: { userId: paid.id, tier: 'pro', active: true, stripeSubscriptionId: 'sub_demo_1' } })

  // optionally create Invoice / StripeEvent rows if those models exist in the schema
  try {
    await prisma.invoice.create({ data: { stripeInvoiceId: 'in_demo_1', subscriptionId: paidSub.id, customerId: 'cus_demo_1', amountDue: 1500, currency: 'usd', status: 'paid', hostedInvoiceUrl: 'https://stripe.test/i/1', invoicePdf: 'https://stripe.test/pdf/1' } })
  } catch (e) {
    console.warn('skipping invoice seed (model may be absent)', e.message)
  }

  try {
    await prisma.stripeEvent.create({ data: { eventId: 'evt_demo_1', type: 'invoice.created', payload: JSON.stringify({ demo: true, invoice: 'in_demo_1' }) } })
  } catch (e) {
    console.warn('skipping stripeEvent seed (model may be absent)', e.message)
  }

  // Marketplace demo data
  try {
    const item = await prisma.marketplaceItem.create({ data: { ownerId: user.id, title: 'Logo Design', description: 'Simple logo for startup', price: 50, company: 'DemoCo' } })
    await prisma.marketplaceApplication.create({ data: { itemId: item.id, applicantId: paid.id, status: 'pending', message: 'I can do this quickly' } })
  } catch (e) {
    console.warn('skipping marketplace seed (models may be absent)', e.message)
  }

  console.log('Seeding finished')
}

main()
  .catch((e)=>{ console.error(e); process.exit(1) })
  .finally(async ()=>{ await prisma.$disconnect() })
