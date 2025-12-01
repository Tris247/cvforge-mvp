import { describe, it, expect, vi, afterAll } from 'vitest'

describe('AI generate with uploaded texts', ()=>{
  const UF = `data/usage.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.USAGE_FILE = UF
  it('merges uploadedTexts into fallback rewrite', async ()=>{
    // mock auth to return user
    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: 'u9', name: 'Merge User' }) }))
    // ensure usage record allows AI for this user (use file-backed usage so allowed() returns true for free tier)
    const fs = require('fs'); const path = require('path'); const p = path.resolve(process.cwd(), process.env.USAGE_FILE || 'data/usage.json'); const dir = path.dirname(p); if(!fs.existsSync(dir)) fs.mkdirSync(dir); fs.writeFileSync(p, JSON.stringify({ u9: { ai: 0, lastReset: new Date().toISOString() } }, null, 2));
    // mock prisma subscription
    vi.doMock('@prisma/client', ()=> ({ PrismaClient: function(){ return { subscription: { findFirst: async ()=> ({ tier: 'free' }) } } } }))

    const { default: handler } = await import('../pages/api/ai/generate')
    const req:any = { method: 'POST', body: { type: 'rewrite', content: '• experience A', uploadedTexts: ['• previous role B\n• contribution C'] }, headers: {} }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await handler(req, res)
    expect(res._out.status).toBe(200)
    expect(String(res._out.body.suggestion)).toContain('Led experience A')
    expect(String(res._out.body.suggestion)).toContain('Led previous role B')
  })
})

afterAll(()=>{ try{ const fs = require('fs'); if(process.env.USAGE_FILE && fs.existsSync(process.env.USAGE_FILE)) fs.unlinkSync(process.env.USAGE_FILE) }catch(e){} })
