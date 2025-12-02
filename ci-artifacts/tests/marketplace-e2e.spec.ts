import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('marketplace full flow e2e-like', ()=>{
  const appsFile = `data/marketplace-applications.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  const marketFile = `data/marketplace.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.MARKETPLACE_APPS_FILE = appsFile
  process.env.MARKETPLACE_FILE = marketFile
  const appsPath = path.resolve(process.cwd(), appsFile)
  const marketPath = path.resolve(process.cwd(), marketFile)

  it('post -> apply -> owner accepts flow completes', async ()=>{
    // ensure files
    fs.writeFileSync(appsPath, '[]')
    fs.writeFileSync(marketPath, '[]')

    const { default: items } = await import('../pages/api/marketplace/index')
    const reqCreate:any = { method: 'POST', body: { title: 'End to End Job', description: 'desc', company: 'Acme', ownerId: 'owner-e2e' } }
    const resCreate:any = { status: (c:number)=> ({ json: (b:any)=> { resCreate._out = { status: c, body: b } } }) }
    await items(reqCreate, resCreate)
    expect(resCreate._out.status).toBe(200)
    const itemId = resCreate._out.body.item.id

    const { default: apply } = await import('../pages/api/marketplace/apply')
    const r1:any = { method: 'POST', body: { itemId, applicantName: 'Sam' } }
    const s1:any = { status: (c:number)=> ({ json: (b:any)=> { s1._out = { status: c, body: b } } }) }
    await apply(r1, s1)
    expect(s1._out.status).toBe(200)

    // mock owner auth for decision
    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: 'owner-e2e', name: 'E2E Owner' }) }))

    const { default: list } = await import('../pages/api/marketplace/applicants/index')
    const lreq:any = { method: 'GET', query: { itemId } }
    const lres:any = { status: (c:number)=> ({ json: (b:any)=> { lres._out = { status: c, body: b } } }) }
    await list(lreq, lres)
    expect(lres._out.status).toBe(200)
    const apps = lres._out.body.applications
    expect(apps.length).toBeGreaterThanOrEqual(1)

    const target = apps[0]
    const { default: decide } = await import('../pages/api/marketplace/applicants/[id]/decision')
    const dreq:any = { method: 'POST', query: { id: target.id }, body: { decision: 'accept' } }
    const dres:any = { status: (c:number)=> ({ json: (b:any)=> { dres._out = { status: c, body: b } } }) }
    await decide(dreq, dres)
    expect(dres._out.status).toBe(200)
    expect(dres._out.body.application.status).toBe('accepted')
  })
})
