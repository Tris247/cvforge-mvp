import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('analytics JSONL', () => {
  const tmpFile = path.resolve(process.cwd(),'data','test-analytics.jsonl')
  beforeEach(() => {
    if(fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    process.env.ANALYTICS_FILE = tmpFile
    // clear require cache for lib
    delete require.cache[require.resolve('../lib/analytics')]
  })
  afterEach(() => {
    try{ if(fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile) }catch(e){}
    delete process.env.ANALYTICS_FILE
  })

  it('appends and reads back events using JSONL', async () => {
    const analytics = require('../lib/analytics')
    analytics.trackEvent('test.event', { userId: 'u1', foo: 'bar' })
    analytics.trackEvent('test.event', { userId: 'u2', foo: 'baz' })
    const arr = analytics.readAll()
    expect(arr.length).toBeGreaterThanOrEqual(2)
    expect(arr[0]).toHaveProperty('name')
    expect(arr[0]).toHaveProperty('payload')
  })
})
