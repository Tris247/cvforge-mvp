import { describe, it, expect, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('marketplace apply API', ()=>{
  const uniqueFile = `data/marketplace-applications.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.MARKETPLACE_APPS_FILE = uniqueFile
  const f = path.resolve(process.cwd(), process.env.MARKETPLACE_APPS_FILE)

  function resetFile(){ fs.writeFileSync(f, '[]') }

  afterAll(()=>{
    try{ if(fs.existsSync(f)) fs.unlinkSync(f) }catch(e){}
  })

  it('POST validation rejects bad input', async ()=>{
    resetFile()
    const mod = await import('../pages/api/marketplace/apply')
    const req:any = { method: 'POST', body: { applicantName: 'Test' } } // missing itemId
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await mod.default(req, res)
    expect(res._out.status).toBe(400)
    expect(res._out.body.error).toBe('validation failed')
  })

  it('POST creates an application and GET returns it', async ()=>{
    resetFile()
    const postMod = await import('../pages/api/marketplace/apply')
    const before = JSON.parse(fs.readFileSync(f,'utf8')||'[]')
    const req:any = { method: 'POST', body: { itemId: 'g1', applicantName: 'Test', message: 'I can help' } }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await postMod.default(req, res)
    expect(res._out.status).toBe(200)
    expect(res._out.body.application).toBeTruthy()

    const getMod = await import('../pages/api/marketplace/apply')
    const req2:any = { method: 'GET' }
    const res2:any = { status: (c:number)=> ({ json: (b:any)=> { res2._out = { status: c, body: b } } }) }
    await getMod.default(req2, res2)
    expect(res2._out.status).toBe(200)
    expect(Array.isArray(res2._out.body.applications)).toBe(true)
    const after = JSON.parse(fs.readFileSync(f,'utf8')||'[]')
    expect(after.length).toBeGreaterThanOrEqual(before.length + 1)
  })

  it('POST accepts embedded CV upload and saves file', async ()=>{
    resetFile()
    const postMod = await import('../pages/api/marketplace/apply')
    const content = Buffer.from('Resume content here').toString('base64')
    const req:any = { method: 'POST', body: { itemId: 'g2', applicantName: 'Upload Test', cvContent: content, cvName: 'resume.txt', cvContentType: 'text/plain' } }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await postMod.default(req, res)
    expect(res._out.status).toBe(200)
    const app = res._out.body.application
    expect(app.cvId).toBeTruthy()
      const savedPath = path.resolve(process.cwd(), app.cvId.replace(/^\//,''))
    expect(fs.existsSync(savedPath)).toBe(true)
    // cleanup saved upload
    try{ fs.unlinkSync(savedPath) }catch(e){}
  })
})
