import { describe, it, expect, afterAll, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('marketplace applicant actions (owner-only)', ()=>{
  const appsFile = `data/marketplace-applications.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  const marketFile = `data/marketplace.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  const notificationsFile = `data/notifications.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.MARKETPLACE_APPS_FILE = appsFile
  process.env.MARKETPLACE_FILE = marketFile
  const appsPath = path.resolve(process.cwd(), appsFile)
  const marketPath = path.resolve(process.cwd(), marketFile)
  process.env.NOTIFICATIONS_FILE = notificationsFile
  const notifPath = path.resolve(process.cwd(), notificationsFile)

  function reset(){ fs.writeFileSync(appsPath, '[]'); fs.writeFileSync(marketPath, '[]') }

  afterAll(()=>{ try{ if(fs.existsSync(appsPath)) fs.unlinkSync(appsPath); if(fs.existsSync(marketPath)) fs.unlinkSync(marketPath) }catch(e){} })

  it('allows owner to message, hire and archive applicants', async ()=>{
    reset()
    const { default: apply } = await import('../pages/api/marketplace/apply')
    const itemId = 'action-item'
    // create two applications
    await apply({ method: 'POST', body: { itemId, applicantName: 'Jane' } } as any, { status: (c:any)=> ({ json: (b:any)=> {} }) } as any)
    await apply({ method: 'POST', body: { itemId, applicantName: 'John' } } as any, { status: (c:any)=> ({ json: (b:any)=> {} }) } as any)

    // marketplace item owned by ownerZ
    const ownerId = 'ownerZ'
    fs.writeFileSync(marketPath, JSON.stringify([{ id: itemId, ownerId, title: 'Test item' }], null, 2))

    // mock auth to return owner
    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: ownerId, name: 'Owner Z' }) }))

    // list applicants - should succeed
    const { default: listHandler } = await import('../pages/api/marketplace/applicants/index')
    const lreq:any = { method: 'GET', query: { itemId } }
    const lres:any = { status: (c:number)=> ({ json: (b:any)=> { lres._out = { status: c, body: b } } }) }
    await listHandler(lreq, lres)
    expect(lres._out.status).toBe(200)

    const apps = JSON.parse(fs.readFileSync(appsPath,'utf8')||'[]')
    expect(apps.length).toBeGreaterThanOrEqual(2)
    const target = apps[0]

    // message
    const { default: msgHandler } = await import('../pages/api/marketplace/applicants/[id]/message')
    const mreq:any = { method: 'POST', query: { id: target.id }, body: { message: 'Please send more info' } }
    const mres:any = { status: (c:number)=> ({ json: (b:any)=> { mres._out = { status: c, body: b } } }) }
    await msgHandler(mreq, mres)
    expect(mres._out.status).toBe(200)
    expect(Array.isArray(mres._out.body.application.messages)).toBe(true)

    // hire
    const { default: hireHandler } = await import('../pages/api/marketplace/applicants/[id]/hire')
    const hreq:any = { method: 'POST', query: { id: target.id } }
    const hres:any = { status: (c:number)=> ({ json: (b:any)=> { hres._out = { status: c, body: b } } }) }
    await hireHandler(hreq, hres)
    expect(hres._out.status).toBe(200)
    expect(hres._out.body.application.status).toBe('hired')

    // archive
    const { default: archiveHandler } = await import('../pages/api/marketplace/applicants/[id]/archive')
    const areq:any = { method: 'POST', query: { id: target.id } }
    const ares:any = { status: (c:number)=> ({ json: (b:any)=> { ares._out = { status: c, body: b } } }) }
    await archiveHandler(areq, ares)
    expect(ares._out.status).toBe(200)
    expect(ares._out.body.application.status).toBe('archived')

    // ensure notifications were created for applicant
    const { listNotifications } = require('../lib/notifications')
    const notes = listNotifications(target.applicantName)
    // message, hired and archived -> at least 3 notifications
    expect(Array.isArray(notes)).toBe(true)
    expect(notes.length).toBeGreaterThanOrEqual(3)
  })
})
