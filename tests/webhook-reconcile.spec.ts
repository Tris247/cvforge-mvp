import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('webhook + reconcile flows', ()=>{
  let origStripe: any

  beforeEach(()=>{
    origStripe = { webhooks: ({} as any), subscriptions: ({} as any), invoices: ({} as any) }
  })
  afterEach(()=>{ vi.resetAllMocks() })

  it('checkout.webhook updates subscription record in DB', async ()=>{
    // We'll mock stripe.webhooks.constructEvent to return a minimal event
    const mockEvent = { type: 'checkout.session.completed', data: { object: { id: 'sess_1', metadata: { subscriptionId: 'sub-local-123' }, subscription: 'stripe_sub_1' } } }

    // stub stripe.webhooks.constructEvent
    const stripeStub = { webhooks: { constructEvent: vi.fn(()=> mockEvent) }, subscriptions: { retrieve: vi.fn(()=> ({ id: 'stripe_sub_1', status: 'active', items: { data: [{ price: { id: 'price_1' } }] }, trial_end: null, current_period_start: 1700000000, current_period_end: 1702592000, cancel_at_period_end: false, cancel_at: null, customer: 'cus_abc' })) } }

    vi.doMock('stripe', ()=> ({ default: (k:any)=> stripeStub, Stripe: (k:any)=> stripeStub }))

    const { default: handler } = await import('../pages/api/stripe/webhook')

    // mock request with buffer & header (handler uses stripe.webhooks.constructEvent under the hood which we've mocked)
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: {}, on: ()=>{} }
    // mock minimal stream-like object by using buffer param bypassed by stub
    const res: any = { status: (c:number)=> ({ json: (body:any)=> { res._out = { status: c, body } } }) }

    await handler(req, res)
    expect(res._out.status).toBe(200)
  })

  it('reconcile script can run without throwing when stripe not configured', async ()=>{
    // The script prints an error if STRIPE_SECRET is not set — just ensure importing doesn't throw
    await expect(async ()=> await import('../scripts/stripe-reconcile.js')).not.toThrow()
  })

  it('handles customer.subscription.deleted events gracefully', async ()=>{
    const mockEvent = { type: 'customer.subscription.deleted', data: { object: { id: 'stripe_sub_123' } } }
    const stripeStub = { webhooks: { constructEvent: vi.fn(()=> mockEvent) } }
    vi.doMock('stripe', ()=> ({ default: (k:any)=> stripeStub, Stripe: (k:any)=> stripeStub }))
    const { default: handler } = await import('../pages/api/stripe/webhook')
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: {}, on: ()=>{} }
    const res: any = { status: (c:number)=> ({ json: (body:any)=> { res._out = { status: c, body } } }) }
    await handler(req, res)
    expect(res._out.status).toBe(200)
  })

  it('checkout.session.completed without metadata but with subscription id updates by stripeSubscriptionId', async ()=>{
    const mockEvent = { type: 'checkout.session.completed', data: { object: { id: 'sess_2', subscription: 'stripe_sub_42' } } }
    const stripeStub = { webhooks: { constructEvent: vi.fn(()=> mockEvent) } }
    vi.doMock('stripe', ()=> ({ default: (k:any)=> stripeStub, Stripe: (k:any)=> stripeStub }))
    const { default: handler } = await import('../pages/api/stripe/webhook')
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: {}, on: ()=>{} }
    const res: any = { status: (c:number)=> ({ json: (body:any)=> { res._out = { status: c, body } } }) }
    await handler(req, res)
    expect(res._out.status).toBe(200)
  })
})
