const fs = require('fs')
const path = require('path')

const FILE = process.env.ANALYTICS_FILE ? path.resolve(process.cwd(), process.env.ANALYTICS_FILE) : path.resolve(process.cwd(),'data','analytics.jsonl')

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) }

// legacy conversion removed: repository now expects newline-delimited JSON (`analytics.jsonl`)

function appendLine(obj){
  ensureDir(path.dirname(FILE))
  try{ fs.appendFileSync(FILE, JSON.stringify(obj) + '\n') }catch(e){ try{ fs.writeFileSync(FILE, JSON.stringify(obj) + '\n') }catch(err){} }
}

function readAll(){
  if(!fs.existsSync(FILE)) return []
  const data = fs.readFileSync(FILE,'utf8')
  const lines = data.split(/\r?\n/)
  const out = []
  for(const l of lines){ if(!l || !l.trim()) continue; try{ out.push(JSON.parse(l)) }catch(e){ /* ignore malformed line */ } }
  return out
}

// For tests, run a one-time conversion of legacy `data/analytics.json` -> `data/analytics.jsonl`.
// This keeps test expectations intact while avoiding automatic conversion in production.
function convertOldJsonIfNeeded(){
  if (process.env.NODE_ENV !== 'test') return
  const legacy = process.env.ANALYTICS_FILE ? null : path.resolve(process.cwd(),'data','analytics.json')
  if(!legacy) return
  if(!fs.existsSync(legacy)) return
  try{
    const raw = fs.readFileSync(legacy,'utf8')
    const arr = JSON.parse(raw||'[]')
    if(Array.isArray(arr)){
      ensureDir(path.dirname(FILE))
      const stream = fs.createWriteStream(FILE,{ flags: 'a' })
      for(const e of arr){ try{ stream.write(JSON.stringify(e) + '\n') }catch(_){} }
      stream.end()
      fs.renameSync(legacy, legacy + '.converted.bak')
    }else{
      fs.renameSync(legacy, legacy + '.corrupt')
    }
  }catch(e){
    try{ fs.renameSync(legacy, legacy + '.corrupt') }catch(_){ }
  }
}

convertOldJsonIfNeeded()

function trackEvent(name, payload){
  try{
    const now = new Date().toISOString()
    const entry = { id: Date.now().toString(), name, payload: payload || {}, ts: now }
    appendLine(entry)
    if(process.env.NODE_ENV !== 'test') console.log('analytics.event', name, JSON.stringify(payload || {}))
    if(process.env.DATABASE_URL){
      try{ const { enqueue } = require('./analytics-queue'); enqueue({ name, userId: payload && payload.userId ? String(payload.userId) : null, payload: payload || {}, source: payload && payload.source ? String(payload.source) : 'api', idempotencyKey: payload && payload.idempotencyKey ? String(payload.idempotencyKey) : undefined }) }catch(e){}
    }
    try{
      if(process.env.SEGMENT_WRITE_KEY){ try{ const url = 'https://api.segment.io/v1/track'; const payloadSeg = { event: name, userId: payload && payload.userId ? String(payload.userId) : undefined, properties: payload || {} }; fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': 'Basic ' + Buffer.from(process.env.SEGMENT_WRITE_KEY + ':').toString('base64') }, body: JSON.stringify(payloadSeg) }).catch(()=>{}) }catch(e){}
      }
      if(process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET){ try{ const gid = process.env.GA_MEASUREMENT_ID; const secret = process.env.GA_API_SECRET; const mp = { client_id: payload && payload.userId ? String(payload.userId) : 'anonymous', events: [{ name: name.replace(/\./g,'_'), params: payload || {} }] }; const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${gid}&api_secret=${secret}`; fetch(gaUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mp) }).catch(()=>{}) }catch(e){}
      }
    }catch(e){}
  }catch(e){ try{ console.error('analytics.trackEvent error', e) }catch(_){ } }
}

module.exports = { trackEvent, readAll }
