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
    const body = req.body || {}
    if(!id) return res.status(400).json({ error: 'missing id' })
    if(!body.message) return res.status(400).json({ error: 'missing message' })

    const items = JSON.parse(fs.readFileSync(FILE,'utf8')||'[]')
    const idx = items.findIndex((a:any)=> String(a.id) === String(id))
    if(idx === -1) return res.status(404).json({ error: 'not found' })

    // owner must own related item
    const app = items[idx]
    const chk = await requireOwner(req, String(app.itemId))
    if(!chk.ok) return res.status(chk.status).json({ error: chk.error })

    items[idx].messages = items[idx].messages || []
    const msgObj = { from: chk.user.id, message: String(body.message), createdAt: new Date().toISOString() }
    items[idx].messages.push(msgObj)
    // create notification for applicant (use applicantId if present, else applicantName)
    const applicantTarget = items[idx].applicantId || items[idx].applicantName || items[idx].id
    try{ addNotification(applicantTarget, 'message', { from: chk.user.id, appId: items[idx].id, text: String(body.message) }) }catch(e){}
    fs.writeFileSync(FILE, JSON.stringify(items, null, 2))
    return res.status(200).json({ application: items[idx] })
  }catch(err){ console.error('marketplace message api error', err); return res.status(500).json({ error: 'failed' }) }
}
