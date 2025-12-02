import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

// optional Prisma support — marketplace applications can be backed by DB when enabled
let prismaApps: any = null
if (process.env.USE_PRISMA_MARKETPLACE === 'true') {
  try{
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client')
    prismaApps = new PrismaClient()
  }catch(e){ prismaApps = null }
}

function ensure(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const FILE = process.env.MARKETPLACE_APPS_FILE ? path.resolve(process.cwd(), process.env.MARKETPLACE_APPS_FILE) : path.resolve(process.cwd(), 'data', 'marketplace-applications.json')
  // resolved marketplace file (items) — prefer explicit env if present
  const MARKET_FILE = process.env.MARKETPLACE_FILE ? path.resolve(process.cwd(), process.env.MARKETPLACE_FILE) : path.resolve(process.cwd(), 'data', 'marketplace.json')
  // debug: capture working dir and resolved file path in CI logs
  try { console.log('apply endpoint: cwd', process.cwd(), 'resolved FILE', FILE) } catch(_) {}
  ensure(FILE)
  try { console.log('apply endpoint: FILE', FILE) } catch(_) {}
  try {
    if (req.method === 'GET') {
      if(prismaApps){
        const created = await prismaApps.marketplaceApplication.create({ data: { itemId: body.itemId || null, applicantName: body.applicantName || null, cvId: body.cvId || null, status: 'pending', message: body.message || null, applicantId: body.applicantId || null } })
        return res.status(200).json({ application: created })
      }

      const items = JSON.parse(fs.readFileSync(FILE, 'utf8') || '[]')
      return res.status(200).json({ applications: items })
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      try { console.log('apply endpoint POST: itemId', body.itemId, 'applicantId', body.applicantId) } catch(_) {}
        // accept an embedded cv upload: { cvContent: base64, cvName, cvContentType }
        if(body.cvContent && body.cvName){
          const UP_DIR = path.resolve(process.cwd(), 'data', 'uploads')
          if(!fs.existsSync(UP_DIR)) fs.mkdirSync(UP_DIR, { recursive: true })
          const safe = `${Date.now()}-${String(body.cvName).replace(/[^a-zA-Z0-9._-]/g,'_')}`
          const dest = path.join(UP_DIR, safe)
          try{ fs.writeFileSync(dest, Buffer.from(String(body.cvContent),'base64'))
            // save the cvId as the txt/asset path available in the app
            body.cvId = `/data/uploads/${safe}`
          }catch(e){ console.error('failed to save cv upload', e) }
        }
      // Basic validation: require itemId and either applicantName or cvId
      const missing: string[] = []
      if (!body.itemId) missing.push('itemId')
      if (!body.applicantName && !body.cvId) missing.push('applicantName|cvId')
      if (missing.length) return res.status(400).json({ error: 'validation failed', missing })
      const items = JSON.parse(fs.readFileSync(FILE, 'utf8') || '[]')
      const newItem = {
        id: String(Date.now()),
        itemId: body.itemId || null,
        applicantName: body.applicantName || null,
        cvId: body.cvId || null,
        status: 'pending',
        message: body.message || null,
        applicantId: body.applicantId || null,
        // record which marketplace items file was used so decision
        // handlers can validate against the same marketplace source in CI/test runs
        sourceMarketplaceFile: MARKET_FILE,
        createdAt: new Date().toISOString(),
      }
      items.unshift(newItem)
      fs.writeFileSync(FILE, JSON.stringify(items, null, 2))
      try { console.log('apply endpoint: wrote application', newItem.id, 'itemId', newItem.itemId) } catch(_) {}
      // analytics: record an application event
      try{ const { trackEvent } = require('../../../lib/analytics'); trackEvent('marketplace.application.created', { itemId: newItem.itemId, applicantId: newItem.applicantId, applicantName: newItem.applicantName }) }catch(e){}
      return res.status(200).json({ application: newItem })
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    console.error('marketplace apply api error', err)
    return res.status(500).json({ error: 'failed' })
  }
}
