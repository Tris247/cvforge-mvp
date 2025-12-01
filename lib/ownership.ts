import fs from 'fs'
import path from 'path'
import { getUserFromReq } from './auth'

export async function requireOwner(req:any, itemId:string){
  const user = await getUserFromReq(req)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  }catch(e){ prisma = null }
}

export async function getMarketplaceItems(filePath?: string){
  if(prisma){
    try{ return await prisma.marketplaceItem.findMany({ orderBy: { createdAt: 'desc' } as any }) }catch(e){ /* fall back to files */ }
  }
  const MARKET_FILE = filePath || (process.env.MARKETPLACE_FILE ? path.resolve(process.cwd(), process.env.MARKETPLACE_FILE) : path.resolve(process.cwd(), 'data', 'marketplace.json'))
  try{ return JSON.parse(fs.readFileSync(MARKET_FILE,'utf8')||'[]') }catch(e){ return [] }
}

export async function requireOwner(req:any, itemId:string){
  let getUserFromReq: any
  try{ getUserFromReq = require('./auth').getUserFromReq }catch(e){ getUserFromReq = null }
  const user = getUserFromReq ? await getUserFromReq(req) : null
  if(!user) return { ok: false, status: 401, error: 'not authenticated' }

  const items = await getMarketplaceItems()
  const it = items.find((i:any)=> String(i.id) === String(itemId))
  if(!it) return { ok: false, status: 404, error: 'item not found' }
  if(it.ownerId !== user.id) return { ok: false, status: 403, error: 'forbidden' }
  return { ok: true, user, item: it }
}
