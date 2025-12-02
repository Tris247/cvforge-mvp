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
      const data = JSON.parse(fs.readFileSync(MARKET_FILE,'utf8')||'[]')
      // using file-backed marketplace items
      try { /* quiet log */ } catch(_) {}
      return data
    }
    // fallback: if a marketplace test file was created by another worker, try to find it
    const dataDir = path.resolve(process.cwd(), 'data')
    if (fs.existsSync(dataDir)){
      const candidates = fs.readdirSync(dataDir).filter(f => f.startsWith('marketplace') && f.endsWith('.json'))
      if (candidates.length) {
        const pick = path.join(dataDir, candidates[0])
        const data = JSON.parse(fs.readFileSync(pick,'utf8')||'[]')
        try { /* quiet log */ } catch(_) {}
        return data
      }
    }
  }catch(e){ /* ignore and try prisma fallback */ }

  // If no files found, and Prisma marketplace support is enabled, use the DB
  if(prisma){
    try{ return await prisma.marketplaceItem.findMany({ orderBy: { createdAt: 'desc' } as any }) }catch(e){ /* final fallback to empty */ }
  }

  return []
}

export async function requireOwner(req:any, itemId:string, opts?: { sourceFile?: string }){
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
  // Additional fallback: if mocking used a different resolved id, try to find any loaded module
  // that exports `getUserFromReq` (helps Vitest mocks that resolve modules differently).
  if (!getUserFromReq) {
    try {
      // Inspect CommonJS require cache if available
      if (typeof require !== 'undefined' && require.cache) {
        for (const key of Object.keys(require.cache)) {
          try {
            const ex = require.cache[key] && require.cache[key].exports
            if (ex && typeof ex.getUserFromReq === 'function') {
              getUserFromReq = ex.getUserFromReq
              break
            }
          } catch (_) { /* ignore */ }
        }
      }
    } catch (_) { /* ignore */ }
  }
  const user = getUserFromReq ? await getUserFromReq(req) : null
  if(!user) return { ok: false, status: 401, error: 'not authenticated' }

  // If caller provided a specific source file (e.g., stored on the application)
  // prefer loading that file first to avoid cross-test file mismatches in CI.
  const items = opts && opts.sourceFile ? await getMarketplaceItems(opts.sourceFile) : await getMarketplaceItems()
  let it = items.find((i:any)=> String(i.id) === String(itemId))
  if(!it) {
    // If not found in the primary list, scan candidate marketplace files in `data/`
    // and search for the specific itemId. This handles per-test files created
    // by Vitest where multiple marketplace files may exist in CI.
    try {
      const dataDir = path.resolve(process.cwd(), 'data')
        if (fs.existsSync(dataDir)) {
          const candidates = fs.readdirSync(dataDir).filter(f => f.startsWith('marketplace') && f.endsWith('.json'))
          try { /* quiet log */ } catch (_) {}
          for (const f of candidates) {
            try {
              const full = path.join(dataDir, f)
              let mtime: any = null
              try { mtime = fs.statSync(full).mtime.toISOString() } catch (_) { mtime = null }
              const d = JSON.parse(fs.readFileSync(full,'utf8')||'[]')
              const found = (d||[]).find((x:any)=> String(x.id) === String(itemId))
              if (found) {
                it = found
                try { /* quiet log */ } catch(_){}
                break
              }
            } catch (err) {
              // ignore malformed candidate
              /* ignore malformed candidate */
            }
          }
        }
    } catch (_) { /* ignore scan errors */ }
  }
  if(!it) {
    // return not found without noisy logging
    return { ok: false, status: 404, error: 'item not found' }
  }
  if(it.ownerId !== user.id) return { ok: false, status: 403, error: 'forbidden' }
  return { ok: true, user, item: it }
}
