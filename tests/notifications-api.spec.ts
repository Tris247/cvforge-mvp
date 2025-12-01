import { describe, it, expect, afterAll, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('notifications API', ()=>{
  const NF = `data/notifications.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  process.env.NOTIFICATIONS_FILE = NF
  const full = path.resolve(process.cwd(), NF)

  afterAll(()=>{ try{ if(fs.existsSync(full)) fs.unlinkSync(full) }catch(e){} })

  it('returns notifications for authenticated user', async ()=>{
    // seed a notification
    const { addNotification } = require('../lib/notifications')
    addNotification('user-1', 'message', { text: 'Hello' })

    vi.doMock('../lib/auth', ()=> ({ getUserFromReq: async ()=> ({ id: 'user-1', name: 'User One' }) }))
    const { default: handler } = await import('../pages/api/notifications/index')
    const req:any = { method: 'GET', query: {} }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await handler(req, res)
    expect(res._out.status).toBe(200)
    expect(Array.isArray(res._out.body.notifications)).toBe(true)
    expect(res._out.body.notifications.length).toBeGreaterThanOrEqual(1)
  })
})
