import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('marketplace auth checks', ()=>{
  const appsFile = `data/marketplace-applications.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  const marketFile = `data/marketplace.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.MARKETPLACE_APPS_FILE = appsFile
  process.env.MARKETPLACE_FILE = marketFile
  const appsPath = path.resolve(process.cwd(), appsFile)
  const marketPath = path.resolve(process.cwd(), marketFile)

  function reset(){ fs.writeFileSync(appsPath, '[]'); fs.writeFileSync(marketPath, '[]') }

  it('prevents non-owners from listing and deciding', async ()=>{
    reset()
    const { default: apply } = await import('../pages/api/marketplace/apply')
    const itemId = 'auth-test-item'
    // create two applications
    await apply({ method: 'POST', body: { itemId, applicantName: 'Jane' } } as any, { status: (c:any)=> ({ json: (b:any)=> {} }) } as any)
    await apply({ method: 'POST', body: { itemId, applicantName: 'John' } } as any, { status: (c:any)=> ({ json: (b:any)=> {} }) } as any)

    // create marketplace item with owner 'ownerX'
    fs.writeFileSync(marketPath, JSON.stringify([{ id: itemId, ownerId: 'ownerX', title: 'Owned by X' }], null, 2))

    // mock auth to return a different user
    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: 'not-owner', name: 'Intruder' }) }))

    const { default: listHandler } = await import('../pages/api/marketplace/applicants/index')
    const listReq:any = { method: 'GET', query: { itemId } }
    const listRes:any = { status: (c:number)=> ({ json: (b:any)=> { listRes._out = { status: c, body: b } } }) }
    await listHandler(listReq, listRes)
    expect(listRes._out.status).toBe(403)

    const allApps = JSON.parse(fs.readFileSync(appsPath, 'utf8')||'[]')
    const target = allApps[0]
    const { default: decideHandler } = await import('../pages/api/marketplace/applicants/[id]/decision')
    const dreq:any = { method: 'POST', query: { id: target.id }, body: { decision: 'reject' } }
    const dres:any = { status: (c:number)=> ({ json: (b:any)=> { dres._out = { status: c, body: b } } }) }
    await decideHandler(dreq, dres)
    expect(dres._out.status).toBe(403) // non-owner should be forbidden from making a decision
  })
})
