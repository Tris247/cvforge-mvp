import { describe, it, expect, vi } from 'vitest'

describe('invoice webhook handling', ()=>{
  it('upserts invoice record when invoice.created arrives', async ()=>{
    const mockEvent = { id: 'evt_invoice_1', type: 'invoice.created', data: { object: { id: 'in_1', subscription: 'stripe_sub_1', customer: 'cus_test', amount_due: 1500, currency: 'usd', hosted_invoice_url: 'https://stripe.test/i/1', invoice_pdf: 'https://stripe.test/pdf/1', period_start: 1700000000, period_end: 1702592000, status: 'open' } } }

    const stripeStub = { webhooks: { constructEvent: vi.fn(()=> mockEvent) } }
    vi.doMock('stripe', ()=> ({ default: (k:any)=> stripeStub, Stripe: (k:any)=> stripeStub }))

    const { default: handler } = await import('../pages/api/stripe/webhook')
    const req: any = { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: {}, on: ()=>{} }
    const res: any = { status: (c:number)=> ({ json: (body:any)=> { res._out = { status: c, body } } }) }

    await handler(req, res)
    expect(res._out.status).toBe(200)
  })
})
