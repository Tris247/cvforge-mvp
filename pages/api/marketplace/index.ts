import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { getUserFromReq } from '../../../lib/auth'
// optional Prisma support: set USE_PRISMA_MARKETPLACE=true to prefer DB-backed storage
let prisma: any = null
if (process.env.USE_PRISMA_MARKETPLACE === 'true') {
  try {
    // require at runtime so tests/dev flows that don't have DB stay unaffected
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  } catch (e) {
    console.warn('Prisma client not available for marketplace (fallback to file):', e?.message)
    prisma = null
  }
}

const DATA_FILE = process.env.MARKETPLACE_FILE ? path.resolve(process.cwd(), process.env.MARKETPLACE_FILE) : path.resolve(process.cwd(), 'data', 'marketplace.json')
function ensure(){ const dir = path.dirname(DATA_FILE); if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]') }

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  ensure()
  try{
    if(req.method === 'GET'){
      if(prisma){
        const items = await prisma.marketplaceItem.findMany({ orderBy: { createdAt: 'desc' } as any })
        return res.status(200).json({ items })
      }
      const items = JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'[]')
      return res.status(200).json({ items })
    }

    if(req.method === 'POST'){
      const body = req.body || {}
      const user = await getUserFromReq(req)
      if(prisma){
        const created = await prisma.marketplaceItem.create({ data: { ownerId: body.ownerId || user?.id || null, title: body.title || 'Untitled', description: body.description || '', price: body.price || null, company: body.company || null } })
        return res.status(200).json({ item: created })
      }

      const items = JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'[]')
      const newItem = { id: String(Date.now()), ownerId: body.ownerId || user?.id || null, title: body.title || 'Untitled', description: body.description || '', price: body.price || null, company: body.company || null, createdAt: new Date().toISOString() }
      items.unshift(newItem)
      fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2))
      return res.status(200).json({ item: newItem })
    }

    return res.status(405).json({ error: 'method not allowed' })
  }catch(err){ console.error('marketplace api error', err); return res.status(500).json({ error: 'failed' }) }
}
