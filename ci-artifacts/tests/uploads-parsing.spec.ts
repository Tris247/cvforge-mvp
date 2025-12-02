import { describe, it, expect, vi, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('uploads API binary parsing (pdf/docx)', ()=>{

  const UF = `data/usage.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.USAGE_FILE = UF
  it('parses PDF using pdf-parse and saves .txt path', async ()=>{
    vi.resetModules()
    // test hook: set a global test parser so handler can pick it up directly
    ;(globalThis as any).__TEST_PDF_PARSE = async (buf:Buffer)=> ({ text: 'PDF: extracted content line A\nline B' })

    // ensure upload handler picks the mock
    const { default: uploadHandler } = await import('../pages/api/uploads/upload')

    const base = Buffer.from('fakepdfdata').toString('base64')
    const req:any = { method: 'POST', body: { name: 'resume.pdf', content: base, contentType: 'application/pdf' } }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await uploadHandler(req, res)
    // response captured in res._out
    expect(res._out.status).toBe(200)
    expect(res._out.body.parsed).toBe(true)
    expect(res._out.body.path).toMatch(/\.txt$/)
    expect(res._out.body.text).toContain('PDF: extracted content')

    // cleanup test parser hook
    delete (globalThis as any).__TEST_PDF_PARSE

    // AI should be able to read it — test by invoking AI handler fallback
    // prepare usage data and mocks
    const savePath = res._out.body.path

    const usageFile = path.resolve(process.cwd(), process.env.USAGE_FILE || 'data/usage.json')
    const dir = path.dirname(usageFile); if(!fs.existsSync(dir)) fs.mkdirSync(dir)
    fs.writeFileSync(usageFile, JSON.stringify({ u20: { ai: 0, lastReset: new Date().toISOString() } }, null, 2))

    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: 'u20', name: 'Test User' }) }))
    vi.doMock('@prisma/client', ()=> ({ PrismaClient: function(){ return { subscription: { findFirst: async ()=> ({ tier: 'free' }) } } } }))

    const { default: aiHandler } = await import('../pages/api/ai/generate')
    const req2:any = { method: 'POST', body: { type: 'rewrite', content: '• client line X', uploadedFiles: [savePath] }, headers: {} }
    const res2:any = { status: (c:number)=> ({ json: (b:any)=> { res2._out = { status: c, body: b } } }) }
    await aiHandler(req2, res2)
    expect(res2._out.status).toBe(200)
    const out = String(res2._out.body.suggestion)
    expect(out).toContain('Led client line X')
    expect(out).toContain('Led PDF: extracted content line A')
  })

  it('parses DOCX using mammoth and saves .txt path', async ()=>{
    vi.resetModules()
    // test hook: set a test mammoth-like extractor on globalThis
    ;(globalThis as any).__TEST_MAMMOTH = { extractRawText: async ({ buffer }:{buffer:Buffer})=> ({ value: 'DOCX: extracted docx line 1\nline2' }) }

    const { default: uploadHandler } = await import('../pages/api/uploads/upload')
    const base = Buffer.from('fake-docx').toString('base64')
    const req:any = { method: 'POST', body: { name: 'file.docx', content: base, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await uploadHandler(req, res)
    // response captured in res._out
    expect(res._out.status).toBe(200)
    expect(res._out.body.parsed).toBe(true)
    expect(res._out.body.path).toMatch(/\.txt$/)
    expect(res._out.body.text).toContain('DOCX: extracted docx')
    delete (globalThis as any).__TEST_MAMMOTH
  })
  afterAll(()=>{ try{ const fs = require('fs'); if(process.env.USAGE_FILE && fs.existsSync(process.env.USAGE_FILE)) fs.unlinkSync(process.env.USAGE_FILE) }catch(e){} })
})
