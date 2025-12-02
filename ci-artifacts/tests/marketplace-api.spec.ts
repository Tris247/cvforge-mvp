import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('marketplace API', ()=>{
  const baseFile = path.resolve(process.cwd(), 'data', 'marketplace.json')

  function resetFile(){ fs.writeFileSync(baseFile, '[]') }
  it('GET returns list', async ()=>{
    const mod = await import('../pages/api/marketplace/index')
    // call the handler directly with a simple mock req/res
    const req:any = { method: 'GET' }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await mod.default(req, res)
    expect(res._out.status).toBe(200)
    expect(Array.isArray(res._out.body.items)).toBe(true)
  })

  it('POST creates an item', async ()=>{
    resetFile()
    const mod = await import('../pages/api/marketplace/index')
    const before = JSON.parse(fs.readFileSync(baseFile,'utf8')||'[]')
    const req:any = { method: 'POST', body: { title: 'Test gig', description: 'testing', price: 10, company: 'Test' } }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await mod.default(req, res)
    expect(res._out.status).toBe(200)
    expect(res._out.body.item).toBeTruthy()
    const after = JSON.parse(fs.readFileSync(baseFile,'utf8')||'[]')
    expect(after.length).toBeGreaterThanOrEqual(before.length + 1)
  })
})
