import fs from 'fs'
import path from 'path'
import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { execSync } from 'child_process'

describe('repair-analytics CLI', () => {
  const tmp = path.resolve(process.cwd(), 'tmp-repair-test')
  const dataDir = path.join(tmp, 'data')
  const file = path.join(dataDir, 'analytics.jsonl')

  beforeEach(() => {
    try{ if(fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true }) }catch(e){}
    fs.mkdirSync(dataDir, { recursive: true })
  })
  afterEach(() => {
    try{ if(fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true }) }catch(e){}
  })

  it('extracts valid lines and writes corrupt lines to .corrupt', () => {
    const valid = JSON.stringify({ id: '1', name: 'ok', payload: {} })
    const bad = '{ this is not json'
    fs.writeFileSync(file, valid + '\n' + bad + '\n' + valid + '\n', 'utf8')
    // run repair script with CWD set to tmp (use absolute path to avoid relative resolution issues)
    const absScript = path.resolve(process.cwd(), 'scripts', 'repair-analytics.js')
    execSync(`node "${absScript.replace(/\\/g,'\\\\')}"`, { cwd: tmp })
    const corruptPath = file + '.corrupt'
    expect(fs.existsSync(file)).toBe(true)
    // corrupt file should exist
    expect(fs.existsSync(corruptPath)).toBe(true)
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)
    expect(lines.length).toBe(2)
  })
})
