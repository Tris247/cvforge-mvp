import fs from 'fs'
import path from 'path'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'

describe('ingest analytics worker', () => {
  const tmp = path.resolve(process.cwd(), 'tmp-ingest-test')
  const dataDir = path.join(tmp, 'data')
  const file = path.join(dataDir, 'analytics.jsonl')

  beforeEach(() => {
    try{ if(fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true }) }catch(e){}
    fs.mkdirSync(dataDir, { recursive: true })
  })
  afterEach(() => {
    try{ if(fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true }) }catch(e){}
  })

  it('batches entries and calls createMany', async () => {
    const e1 = JSON.stringify({ id: '1', name: 'ev.a', payload: { userId: 'u1' } })
    const e2 = JSON.stringify({ id: '2', name: 'ev.b', payload: { userId: 'u2' } })
    const e3 = JSON.stringify({ id: '3', name: 'ev.c', payload: { userId: 'u3' } })
    fs.writeFileSync(file, e1 + '\n' + e2 + '\n' + e3 + '\n', 'utf8')

    const fakePrisma = { event: { createMany: vi.fn(async ({ data }) => ({ count: data.length })) }, $disconnect: vi.fn(async () => {}) }
    const modPath = path.resolve(process.cwd(), 'scripts', 'ingest-analytics-worker.js')
    const { ingestFile } = require(modPath)
    const res = await ingestFile(file, fakePrisma, { batchSize: 2, rotate: false })
    expect(res.imported).toBe(3)
    // ensure createMany was called twice (batch 2 and batch 1)
    expect(fakePrisma.event.createMany).toHaveBeenCalled()
    const calls = fakePrisma.event.createMany.mock.calls
    const total = calls.reduce((s, c) => s + (c[0] && c[0].data ? c[0].data.length : 0), 0)
    expect(total).toBe(3)
  })
})
