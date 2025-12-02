import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { requireOwner } from '../../../../lib/ownership'

let prismaApps: any = null
if(process.env.USE_PRISMA_MARKETPLACE === 'true'){
  try{ // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client'); prismaApps = new PrismaClient()
  }catch(e){ prismaApps = null }
}

function ensure(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const FILE = process.env.MARKETPLACE_APPS_FILE ? path.resolve(process.cwd(), process.env.MARKETPLACE_APPS_FILE) : path.resolve(process.cwd(), 'data', 'marketplace-applications.json')
  ensure(FILE)
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })

    const { itemId } = req.query
    // require itemId and that the caller owns the item
    if (!itemId) return res.status(400).json({ error: 'missing itemId' })
    const check = await requireOwner(req, String(itemId))
    if(!check.ok) return res.status(check.status).json({ error: check.error })
    if (prismaApps) {
      const apps = await prismaApps.marketplaceApplication.findMany({ where: { itemId: String(itemId) } })
      return res.status(200).json({ applications: apps })
    }
    const items = JSON.parse(fs.readFileSync(FILE, 'utf8') || '[]')
    if (itemId) {
      const filtered = items.filter((a: any) => String(a.itemId) === String(itemId))
      try { console.warn('list endpoint: FILE', FILE, 'itemId', itemId, 'returning', filtered.slice(0,10).map((x:any)=>x.id)) } catch(e){}
      return res.status(200).json({ applications: filtered })
    }

    return res.status(200).json({ applications: items })
  } catch (err) {
    console.error('marketplace applicants api error', err)
    return res.status(500).json({ error: 'failed' })
  }
}
