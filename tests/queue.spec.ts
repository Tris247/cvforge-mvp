import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

const QF = path.resolve(process.cwd(),'data','queue.json')

function ensureClean(){ const dir = path.dirname(QF); if(!fs.existsSync(dir)) fs.mkdirSync(dir); fs.writeFileSync(QF, '[]') }

describe('file-backed queue (lib/queue.ts) behavior', ()=>{
  beforeEach(()=>{ ensureClean() })
  afterEach(()=>{ ensureClean() })

  it('enqueue then peekAll returns item', async ()=>{
    const { enqueue, peekAll, dequeueOne } = await import('../lib/queue')
    const item = await enqueue({ jobId: 'j1', cvId: 'c1' })
    expect(item).toBeTruthy()
    const all = await peekAll()
    expect(Array.isArray(all)).toBe(true)
    expect(all.length).toBeGreaterThanOrEqual(1)

    const popped = await dequeueOne()
    expect(popped).toBeTruthy()
    const after = await peekAll()
    expect(Array.isArray(after)).toBe(true)
  })
})
