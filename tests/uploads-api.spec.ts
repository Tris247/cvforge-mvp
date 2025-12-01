import { describe, it, expect, vi, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('server upload API and AI merge', ()=>{
  const UF = `data/usage.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.USAGE_FILE = UF
  it('accepts upload and AI uses saved file text', async ()=>{
    const { default: uploadHandler } = await import('../pages/api/uploads/upload')
    const req:any = { method: 'POST', body: { name: 'server-sample.txt', content: '• server role B\n• contribution C', contentType: 'text/plain' } }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await uploadHandler(req, res)
    expect(res._out.status).toBe(200)
    const savedPath = res._out.body.path

    // ensure usage allows AI for new user id
    const usageFile = path.resolve(process.cwd(), process.env.USAGE_FILE || 'data/usage.json')
    const dir = path.dirname(usageFile); if(!fs.existsSync(dir)) fs.mkdirSync(dir)
    fs.writeFileSync(usageFile, JSON.stringify({ u10: { ai: 0, lastReset: new Date().toISOString() } }, null, 2))

    // mock auth and prisma
    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: 'u10', name: 'Server User' }) }))
    vi.doMock('@prisma/client', ()=> ({ PrismaClient: function(){ return { subscription: { findFirst: async ()=> ({ tier: 'free' }) } } } }))

    const { default: aiHandler } = await import('../pages/api/ai/generate')
    const req2:any = { method: 'POST', body: { type: 'rewrite', content: '• client line X', uploadedFiles: [savedPath] }, headers: {} }
    const res2:any = { status: (c:number)=> ({ json: (b:any)=> { res2._out = { status: c, body: b } } }) }
    await aiHandler(req2, res2)
    expect(res2._out.status).toBe(200)
    const out = String(res2._out.body.suggestion)
    expect(out).toContain('Led client line X')
    expect(out).toContain('Led server role B')
  })
})

afterAll(()=>{ try{ const fs = require('fs'); if(process.env.USAGE_FILE && fs.existsSync(process.env.USAGE_FILE)) fs.unlinkSync(process.env.USAGE_FILE) }catch(e){} })
