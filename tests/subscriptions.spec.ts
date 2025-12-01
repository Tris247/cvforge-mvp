import { describe, it, expect } from 'vitest'

function makeRes(){
  let statusCode = 200; let jsonBody = null
  return {
    status: (c:number) => { statusCode = c; return { json: (b:any)=> { jsonBody = b } } },
    _get: ()=> ({ statusCode, jsonBody })
  }
}

describe('subscriptions endpoints - auth checks', ()=>{
  it('cancel should return 401 when not authenticated', async ()=>{
    const { default: handler } = await import('../pages/api/subscriptions/cancel')
    const req: any = { method: 'POST', headers: {} }
    const res: any = makeRes()
    await handler(req, res)
    const out = res._get()
    expect(out.statusCode).toBe(401)
  })

  it('reactivate should return 401 when not authenticated', async ()=>{
    const { default: handler } = await import('../pages/api/subscriptions/reactivate')
    const req: any = { method: 'POST', headers: {} }
    const res: any = makeRes()
    await handler(req, res)
    const out = res._get()
    expect(out.statusCode).toBe(401)
  })

  it('status should return 401 when not authenticated', async ()=>{
    const { default: handler } = await import('../pages/api/subscriptions/status')
    const req: any = { method: 'GET', headers: {} }
    const res: any = makeRes()
    await handler(req, res)
    const out = res._get()
    expect(out.statusCode).toBe(401)
  })
})
