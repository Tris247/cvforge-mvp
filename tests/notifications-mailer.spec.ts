import { describe, it, expect, vi, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('notifications mailer integration', ()=>{
  const notificationsFile = `data/notifications.test-${Date.now()}-${Math.floor(Math.random()*10000)}.json`
  const notifPath = path.resolve(process.cwd(), notificationsFile)
  process.env.NOTIFICATIONS_FILE = notificationsFile

  afterAll(()=>{ try{ if(fs.existsSync(notifPath)) fs.unlinkSync(notifPath) }catch(e){} })

  it('calls the mailer when enabled', async ()=>{
    // mock mailer before requiring notifications module
    // spy on the real mailer export so we don't load external transport
    // require to get CommonJS exports so spied function is the same object used by notifications
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mailer = require('../lib/mailer')
    const sendMock = vi.spyOn(mailer, 'sendNotificationEmail').mockImplementation(async ()=> 'preview://example')

    process.env.MAILER_ENABLED = 'true'

    // require notifications (will pick up spied mailer)
    const { addNotification, listNotifications } = await import('../lib/notifications')

    const n = addNotification('target-user', 'test:type', { title: 'Howdy' })

    // addNotification triggers send asynchronously — wait a tick
    // allow the async delivery task to be scheduled/finished
    await new Promise(r => setTimeout(r, 150))

    expect(sendMock).toHaveBeenCalled()
    expect(sendMock.mock.calls[0][0]).toBe('target-user')

    const notes = listNotifications('target-user')
    expect(notes.length).toBeGreaterThanOrEqual(1)
  })
})
