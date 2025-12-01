import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('subscription flows (integration-like)', ()=>{
  beforeAll(async ()=>{
    // Ensure demo user & basic data exist using Prisma directly
    const demo = await prisma.user.upsert({ where: { email: 'demo@cvforge.local' }, update: {}, create: { email: 'demo@cvforge.local', name: 'Demo User' } })
    await prisma.cV.upsert({ where: { id: 'cv-demo-1' }, update: {}, create: { id: 'cv-demo-1', title: 'Full Stack Developer', content: '• Built services', ownerId: demo.id } })
  })

  afterAll(async ()=>{ await prisma.$disconnect() })

  it('creates demo subscription via /api/subscriptions/checkout', async ()=>{
    vi.resetModules()
    // mock authenticated user that matches seeded demo row
    const user = await prisma.user.findUnique({ where: { email: 'demo@cvforge.local' } })
    expect(user).toBeTruthy()
    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> user }))
    const { default: handler } = await import('../pages/api/subscriptions/checkout')

    // call handler
    const req: any = { method: 'POST', body: { tier: 'starter' }, headers: {} }
    const res: any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await handler(req, res)
    expect(res._out.status).toBe(200)
    expect(res._out.body.demo).toBe(true)

    // verify DB
    const sub = await prisma.subscription.findFirst({ where: { user: { email: 'demo@cvforge.local' } }, orderBy: { createdAt: 'desc' } })
    expect(sub).toBeTruthy()
    expect(sub?.tier).toBe('starter')
  })

  it('webhook checkout.session.completed maps pending subscription by metadata', async ()=>{
    // create a pending subscription that mimics upgrade flow
    const user = await prisma.user.findUnique({ where: { email: 'demo@cvforge.local' } })
    expect(user).toBeTruthy()
    const pending = await prisma.subscription.create({ data: { userId: user!.id, tier: 'pro', active: false } })

    // mock stripe event with metadata.subscriptionId pointing to pending.id
    const event = { id: 'evt_test_1', type: 'checkout.session.completed', data: { object: { id: 'sess_x', metadata: { subscriptionId: pending.id }, subscription: 'stripe_sub_x' } } }
    // Call the extracted handler logic directly so we can bypass webhook signature verification
    const { handleStripeEvent } = await import('../pages/api/stripe/webhook')
    await handleStripeEvent(event)

    const updated = await prisma.subscription.findUnique({ where: { id: pending.id } })
    expect(updated).toBeTruthy()
    expect(updated?.active).toBe(true)
  })
})
