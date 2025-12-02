import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { requireOwner } from '../../../../../lib/ownership'

function ensure(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const FILE = process.env.MARKETPLACE_APPS_FILE ? path.resolve(process.cwd(), process.env.MARKETPLACE_APPS_FILE) : path.resolve(process.cwd(), 'data', 'marketplace-applications.json')
  ensure(FILE)
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

    const { id } = req.query
    const body = req.body || {}
    const { decision } = body
    if (!id) return res.status(400).json({ error: 'missing id' })
    if (!decision || (decision !== 'accept' && decision !== 'reject')) return res.status(400).json({ error: 'invalid decision' })

    const items = JSON.parse(fs.readFileSync(FILE, 'utf8') || '[]')
    const idx = items.findIndex((a: any) => String(a.id) === String(id))
    if (idx === -1) return res.status(404).json({ error: 'not found' })

    // ensure the calling user is owner of the item this application belongs to
    const app = items[idx]
    // Debug: surface which file and application are being processed in CI
    try { console.warn('decision endpoint: FILE', FILE, 'appId', app.id, 'appItemId', app.itemId) } catch(e){}
    // If the application recorded which marketplace file it was created from,
    // prefer that source when validating ownership to avoid CI/test file mismatches.
    const check = await requireOwner(req, String(app.itemId), { sourceFile: (app && app.sourceMarketplaceFile) || undefined })
    if(!check.ok) { try { console.warn('decision endpoint: requireOwner failed', check) } catch(e){} }
    if(!check.ok) return res.status(check.status).json({ error: check.error })

    items[idx].status = decision === 'accept' ? 'accepted' : 'rejected'
    items[idx].decidedAt = new Date().toISOString()

    fs.writeFileSync(FILE, JSON.stringify(items, null, 2))
    return res.status(200).json({ application: items[idx] })
  } catch (err) {
    console.error('marketplace applicants decision api error', err)
    return res.status(500).json({ error: 'failed' })
  }
}
