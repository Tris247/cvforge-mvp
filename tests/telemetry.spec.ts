import { describe, it, expect } from 'vitest'

describe('telemetry helper', ()=>{
  it('does not throw when SENTRY_DSN not configured', ()=>{
    delete process.env.SENTRY_DSN
    const { captureException } = require('../lib/telemetry')
    expect(()=> captureException(new Error('test'))).not.toThrow()
  })
})
