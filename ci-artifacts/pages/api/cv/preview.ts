import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const UP_DIR = path.resolve(process.cwd(), 'data', 'uploads')

function safeJoin(p: string){
  // prevent escaping out of data/uploads
  const resolved = path.resolve(process.cwd(), p.replace(/^\//, ''))
  if(!resolved.startsWith(UP_DIR)) return null
  return resolved
}

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const { path: p } = req.query
  if(!p) return res.status(400).json({ error: 'missing path' })
  const clean = safeJoin(String(p))
  if(!clean) return res.status(400).json({ error: 'unsafe path' })
  if(!fs.existsSync(clean)) return res.status(404).json({ error: 'not found' })
  try{
    const txt = fs.readFileSync(clean, 'utf8')
    return res.status(200).json({ text: txt })
  }catch(e){ console.error(e); return res.status(500).json({ error: 'failed' }) }
}
