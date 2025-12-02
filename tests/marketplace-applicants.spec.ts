import { describe, it, expect, afterAll, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('marketplace applicants API', ()=>{
  const uniqueFile = `data/marketplace-applications.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.MARKETPLACE_APPS_FILE = uniqueFile
  const f = path.resolve(process.cwd(), process.env.MARKETPLACE_APPS_FILE)
  function resetFile(){ fs.writeFileSync(f, '[]') }

  afterAll(()=>{
    try{ if(fs.existsSync(f)) fs.unlinkSync(f) }catch(e){}
  })

  it('lists applicants for an item and lets employers accept/reject', async ()=>{
    resetFile()
    const uniqueItem = `jobA-${Date.now()}-${Math.floor(Math.random()*10000)}`
    // ensure both marketplace items and apps files are deterministic for this test
    const MARKET_FILE = `data/marketplace.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
    process.env.MARKETPLACE_FILE = MARKET_FILE
    const marketPath = path.resolve(process.cwd(), process.env.MARKETPLACE_FILE)
    const ownerId = 'owner-1'
    // create the marketplace items file before creating applications so handlers
    // resolve the same source file in CI and local runs
    fs.writeFileSync(marketPath, JSON.stringify([{ id: uniqueItem, ownerId, title: 'Test item' }], null, 2))
    // mock auth to return owner
    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: ownerId, name: 'Owner User' }) }))
    const applyMod = await import('../pages/api/marketplace/apply')
    const req1:any = { method: 'POST', body: { itemId: uniqueItem, applicantName: 'Alice', message: 'ok' } }
    const res1:any = { status: (c:number)=> ({ json: (b:any)=> { res1._out = { status: c, body: b } } }) }
    await applyMod.default(req1, res1)
    expect(res1._out.status).toBe(200)

    const req2:any = { method: 'POST', body: { itemId: uniqueItem, applicantName: 'Bob', message: 'hi' } }
    const res2:any = { status: (c:number)=> ({ json: (b:any)=> { res2._out = { status: c, body: b } } }) }
    await applyMod.default(req2, res2)
    expect(res2._out.status).toBe(200)

    const req3:any = { method: 'POST', body: { itemId: 'jobB', applicantName: 'Carol', message: 'hello' } }
    const res3:any = { status: (c:number)=> ({ json: (b:any)=> { res3._out = { status: c, body: b } } }) }
    await applyMod.default(req3, res3)
    expect(res3._out.status).toBe(200)

    // list for jobA
    const listMod = await import('../pages/api/marketplace/applicants/index')
    const lreq:any = { method: 'GET', query: { itemId: uniqueItem } }
    const lres:any = { status: (c:number)=> ({ json: (b:any)=> { lres._out = { status: c, body: b } } }) }
    await listMod.default(lreq, lres)
    expect(lres._out.status).toBe(200)
    expect(Array.isArray(lres._out.body.applications)).toBe(true)
    expect(lres._out.body.applications.length).toBe(2)

    // accept one of the jobA applicants
    const appToDecide = lres._out.body.applications[0]
    const decisionMod = await import('../pages/api/marketplace/applicants/[id]/decision')
    const dreq:any = { method: 'POST', query: { id: appToDecide.id }, body: { decision: 'accept' } }
    const dres:any = { status: (c:number)=> ({ json: (b:any)=> { dres._out = { status: c, body: b } } }) }
    await decisionMod.default(dreq, dres)
    expect(dres._out.status).toBe(200)
    expect(dres._out.body.application.status).toBe('accepted')

    // confirm file updated
    const all = JSON.parse(fs.readFileSync(f,'utf8')||'[]')
    const found = all.find((a:any)=> a.id === appToDecide.id)
    expect(found).toBeTruthy()
    expect(found.status).toBe('accepted')

    // invalid decision id -> 404
    const badreq:any = { method: 'POST', query: { id: 'nope' }, body: { decision: 'reject' } }
    const badres:any = { status: (c:number)=> ({ json: (b:any)=> { badres._out = { status: c, body: b } } }) }
    await decisionMod.default(badreq, badres)
    expect(badres._out.status).toBe(404)
    // cleanup market file
    try{ if(fs.existsSync(marketPath)) fs.unlinkSync(marketPath) }catch(e){}
  })
})
