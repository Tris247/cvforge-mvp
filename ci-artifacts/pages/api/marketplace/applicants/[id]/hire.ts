import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { requireOwner } from '../../../../../lib/ownership'
const { addNotification } = require('../../../../../lib/notifications')

function ensure(filePath: string){ const dir = path.dirname(filePath); if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); if(!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]') }

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const FILE = process.env.MARKETPLACE_APPS_FILE ? path.resolve(process.cwd(), process.env.MARKETPLACE_APPS_FILE) : path.resolve(process.cwd(), 'data', 'marketplace-applications.json')
  ensure(FILE)
  try{
    if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
    const { id } = req.query
    if(!id) return res.status(400).json({ error: 'missing id' })

    const items = JSON.parse(fs.readFileSync(FILE,'utf8')||'[]')
    const idx = items.findIndex((a:any)=> String(a.id) === String(id))
    if(idx === -1) return res.status(404).json({ error: 'not found' })

    const app = items[idx]
    const chk = await requireOwner(req, String(app.itemId))
    if(!chk.ok) return res.status(chk.status).json({ error: chk.error })

    items[idx].status = 'hired'
    items[idx].hiredAt = new Date().toISOString()
    try{ const applicantTarget = items[idx].applicantId || items[idx].applicantName || items[idx].id; addNotification(applicantTarget, 'hired', { appId: items[idx].id, itemId: items[idx].itemId }) }catch(e){}
    fs.writeFileSync(FILE, JSON.stringify(items, null, 2))
    return res.status(200).json({ application: items[idx] })
  }catch(err){ console.error('marketplace hire api error', err); return res.status(500).json({ error: 'failed' }) }
}
