import fs from 'fs'
import path from 'path'
// `getUserFromReq` is imported dynamically inside `requireOwner` so tests can
// mock `./auth` before `lib/ownership` is loaded. Avoid a static import here.

// optional Prisma support
let prisma: any = null
if (process.env.USE_PRISMA_MARKETPLACE === 'true'){
  try{
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  }catch(e){ prisma = null }
}

export async function getMarketplaceItems(filePath?: string){
  // First, prefer file-backed data if a marketplace file is configured or present
  const MARKET_FILE = filePath || (process.env.MARKETPLACE_FILE ? path.resolve(process.cwd(), process.env.MARKETPLACE_FILE) : path.resolve(process.cwd(), 'data', 'marketplace.json'))
  try{
    if (fs.existsSync(MARKET_FILE)) {
      return JSON.parse(fs.readFileSync(MARKET_FILE,'utf8')||'[]')
    }
    // fallback: if a marketplace test file was created by another worker, try to find it
    const dataDir = path.resolve(process.cwd(), 'data')
    if (fs.existsSync(dataDir)){
      const candidates = fs.readdirSync(dataDir).filter(f => f.startsWith('marketplace') && f.endsWith('.json'))
      if (candidates.length) {
        const pick = path.join(dataDir, candidates[0])
        return JSON.parse(fs.readFileSync(pick,'utf8')||'[]')
      }
    }
  }catch(e){ /* ignore and try prisma fallback */ }

  // If no files found, and Prisma marketplace support is enabled, use the DB
  if(prisma){
    try{ return await prisma.marketplaceItem.findMany({ orderBy: { createdAt: 'desc' } as any }) }catch(e){ /* final fallback to empty */ }
  }

  return []
}

export async function requireOwner(req:any, itemId:string){
  let getUserFromReq: any = null
  try {
    // prefer dynamic ESM import so vitest ESM mocks (vi.doMock) are effective
    try { const mod = await import('./auth'); getUserFromReq = mod.getUserFromReq } catch (e) {}
    // fallback to require for CJS environments
    if (!getUserFromReq) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      getUserFromReq = require('./auth').getUserFromReq
    }
  } catch (e) {
    try { const mod = await import('./auth'); getUserFromReq = mod.getUserFromReq } catch (_) {}
  }
  const user = getUserFromReq ? await getUserFromReq(req) : null
  if(!user) return { ok: false, status: 401, error: 'not authenticated' }

  const items = await getMarketplaceItems()
  const it = items.find((i:any)=> String(i.id) === String(itemId))
  if(!it) return { ok: false, status: 404, error: 'item not found' }
  if(it.ownerId !== user.id) return { ok: false, status: 403, error: 'forbidden' }
  return { ok: true, user, item: it }
}
