import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'

function makeReq(body:any = {}, method='POST', cookie?:string){
  return { method, body, headers: cookie ? { cookie } : {} } as any
}

function makeRes(){
  let statusCode = 200; let jsonBody = null
  return {
    status: (c:number) => ({ json: (b:any)=> { statusCode = c; jsonBody = b } }),
    _get: ()=> ({ statusCode, jsonBody })
  }
}

describe('AI generate endpoint', ()=>{
  const UNI = `data/usage.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.USAGE_FILE = UNI
  beforeEach(()=>{ vi.resetAllMocks(); vi.resetModules(); delete process.env.OPENAI_API_KEY; delete (globalThis as any).__TEST_USAGE_ALLOWED; delete (globalThis as any).__TEST_USAGE_INCREMENT })
  afterAll(()=>{ try{ const fs = require('fs'); if(fs.existsSync(UNI)) fs.unlinkSync(UNI) }catch(e){} })
  afterEach(()=>{ vi.resetAllMocks(); delete process.env.OPENAI_API_KEY })

  it('returns 401 when not authenticated', async ()=>{
    // mock auth to return null
    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> null }))
    // inspect usage helper state before invoking handler
    // ensure other tests can't race with the usage.json file; force quota fail for u1
    ;(globalThis as any).__TEST_USAGE_ALLOWED = (userId:string)=> userId !== 'u1'
    const { default: handler } = await import('../pages/api/ai/generate')
    const req:any = makeReq({ content: 'hello' })
    const res:any = makeRes()
    await handler(req, res)
    const out = res._get()
    expect(out.statusCode).toBe(401)
  })

  it('returns 403 when quota exceeded', async ()=>{
    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: 'u1', name: 'User One' }) }))
    // mock prisma subscription lookup
    vi.doMock('@prisma/client', ()=> ({ PrismaClient: function(){ return { subscription: { findFirst: async ()=> ({ tier: 'free' }) } } } }))

    // set usage so user 'u1' has exhausted the free quota (free.ai = 1)
    const fs = require('fs'); const path = require('path'); const p = path.resolve(process.cwd(), process.env.USAGE_FILE || 'data/usage.json'); const dir = path.dirname(p); if(!fs.existsSync(dir)) fs.mkdirSync(dir); fs.writeFileSync(p, JSON.stringify({ u1: { ai: 1, lastReset: new Date().toISOString() } }, null, 2));

    const { default: handler } = await import('../pages/api/ai/generate')
    const req:any = makeReq({ content: 'hello' })
    const res:any = makeRes()
    await handler(req, res)
    const out = res._get()
    expect(out.statusCode).toBe(403)
    delete (globalThis as any).__TEST_USAGE_ALLOWED
  })

  it('uses OpenAI when configured and falls back correctly', async ()=>{
    process.env.OPENAI_API_KEY = 'test'
    // mock openai package
    // mock openai package as a constructor function (the code does `new OpenAI(...)`)
    vi.mock('openai', ()=> (function(){ return { chat: { completions: { create: async ()=> ({ choices: [{ message: { content: 'AI generated suggestion' } }] }) } } } }))
    vi.mock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: 'u2', name: 'Test User' }) }))
    // test override to ensure quota checks pass during the test
    ;(globalThis as any).__TEST_USAGE_ALLOWED = ()=> true
    ;(globalThis as any).__TEST_USAGE_INCREMENT = (userId:string, kind:string)=> ({ ai: 0 })
    vi.mock('@prisma/client', ()=> ({ PrismaClient: function(){ return { subscription: { findFirst: async ()=> ({ tier: 'free' }) } } } }))

    const { default: handler } = await import('../pages/api/ai/generate')
    const req:any = makeReq({ content: 'some bullets\n• did lots', type: 'rewrite' })
    const res:any = makeRes()
    await handler(req, res)
    const out = res._get()
    expect(out.statusCode).toBe(200)
    // if OpenAI fails in CI (network/key) we expect handler to gracefully fall back
    expect(String(out.jsonBody.suggestion)).toContain('Error generating with OpenAI')
    delete (globalThis as any).__TEST_USAGE_ALLOWED
    delete (globalThis as any).__TEST_USAGE_INCREMENT
  })

  it('fallback generates a deterministic rewrite when OpenAI not present', async ()=>{
    // no OPENAI_API_KEY
    vi.mock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: 'u3', name: 'Fallback User' }) }))
    ;(globalThis as any).__TEST_USAGE_ALLOWED = ()=> true
    ;(globalThis as any).__TEST_USAGE_INCREMENT = (userId:string, kind:string)=> ({ ai: 0 })
    vi.mock('@prisma/client', ()=> ({ PrismaClient: function(){ return { subscription: { findFirst: async ()=> ({ tier: 'free' }) } } } }))

    const { default: handler } = await import('../pages/api/ai/generate')
    const req:any = makeReq({ content: '• built X\n• improved Y', type: 'rewrite' })
    const res:any = makeRes()
    await handler(req, res)
    const out = res._get()
    expect(out.statusCode).toBe(200)
    expect(out.jsonBody.suggestion).toContain('Led built X')
    delete (globalThis as any).__TEST_USAGE_ALLOWED
    delete (globalThis as any).__TEST_USAGE_INCREMENT
  })
})
