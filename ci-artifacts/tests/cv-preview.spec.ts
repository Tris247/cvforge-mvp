import { describe, it, expect, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('CV preview API', ()=>{
  const upDir = path.resolve(process.cwd(), 'data', 'uploads')
  function ensure(){ if(!fs.existsSync(upDir)) fs.mkdirSync(upDir, { recursive: true }) }
  const file = path.join('data','uploads', `test-cv-${Date.now()}.txt`)
  const full = path.resolve(process.cwd(), file)
  it('returns uploaded txt contents', async ()=>{
    ensure()
    fs.writeFileSync(full, 'Hello CV content')
    const { default: handler } = await import('../pages/api/cv/preview')
    const req:any = { query: { path: file } }
    const res:any = { status: (c:number)=> ({ json: (b:any)=> { res._out = { status: c, body: b } } }) }
    await handler(req, res)
    expect(res._out.status).toBe(200)
    expect(res._out.body.text).toContain('Hello CV content')
  })

  afterAll(()=>{ try{ if(fs.existsSync(full)) fs.unlinkSync(full) }catch(e){} })
})
