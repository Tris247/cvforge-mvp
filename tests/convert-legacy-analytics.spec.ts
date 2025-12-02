import fs from 'fs'
import path from 'path'
import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { execSync } from 'child_process'

describe('legacy analytics conversion', () => {
  const tmp = path.resolve(process.cwd(), 'tmp-analytics-test')
  const dataDir = path.join(tmp, 'data')
  beforeEach(() => {
    try{ if(fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true }) }catch(e){}
    fs.mkdirSync(dataDir, { recursive: true })
  })
  afterEach(() => {
    try{ if(fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true }) }catch(e){}
    // clear module cache
    try{ delete require.cache[require.resolve('../lib/analytics')] }catch(e){}
  })

  it('converts legacy data/analytics.json array to JSONL', () => {
    const legacyFile = path.join(dataDir, 'analytics.json')
    const arr = [{ id: '1', name: 'a', payload: {} }, { id: '2', name: 'b', payload: {} }]
    fs.writeFileSync(legacyFile, JSON.stringify(arr, null, 2), 'utf8')
    // run the conversion via child process with explicit cwd
    // Windows-friendly quoting
    const cmd = 'node -e "require(\'../lib/analytics\')"'
    execSync(cmd, { cwd: tmp, stdio: 'inherit' })
    // ensure converted file exists
    const converted = path.join(dataDir, 'analytics.jsonl')
    const backup = legacyFile + '.converted.bak'
    expect(fs.existsSync(converted)).toBe(true)
    expect(fs.existsSync(backup)).toBe(true)
    const lines = fs.readFileSync(converted, 'utf8').split(/\r?\n/).filter(Boolean)
    expect(lines.length).toBe(2)
    const parsed = lines.map(l => JSON.parse(l))
    expect(parsed[0].name).toBe('a')
  })
})
