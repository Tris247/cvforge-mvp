const LRU = new Map()

// Simple in-memory sliding window rate limiter. Not suitable for multi-instance production.
// Configure via env: RATE_LIMIT_WINDOW_SECONDS (default 60), RATE_LIMIT_MAX (default 60)
const WINDOW = Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 60)
const MAX = Number(process.env.RATE_LIMIT_MAX || 60)

function _key(id){ return `rl:${id}` }

function allow(id){
  const k = _key(id || 'anon')
  const now = Date.now()
  let item = LRU.get(k)
  if(!item) item = { ts: now, count: 0 }
  // remove window-old counts: if outside window, reset
  if(now - item.ts > WINDOW*1000){ item.ts = now; item.count = 0 }
  item.count = (item.count || 0) + 1
  LRU.set(k, item)
  return item.count <= MAX
}

module.exports = { allow }
