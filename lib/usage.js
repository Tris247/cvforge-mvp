const fs = require('fs')
const path = require('path')

const FILE = process.env.USAGE_FILE ? path.resolve(process.cwd(), process.env.USAGE_FILE) : path.resolve(process.cwd(),'data','usage.json')

function ensure(){ const dir = path.dirname(FILE); if(!fs.existsSync(dir)) fs.mkdirSync(dir); if(!fs.existsSync(FILE)) fs.writeFileSync(FILE,'{}') }

const QUOTAS = {
  free: { ai: 1 },
  starter: { ai: 10 },
  pro: { ai: 100 },
  team: { ai: 1000 },
  enterprise: { ai: -1 }
}

function read(){ ensure(); return JSON.parse(fs.readFileSync(FILE,'utf8')||'{}') }
function write(obj){ fs.writeFileSync(FILE, JSON.stringify(obj,null,2)) }

function getUsage(userId){ const data = read(); return data[userId] || { ai: 0, lastReset: null } }

function increment(userId, kind='ai'){
  // test override hook
  if((globalThis).__TEST_USAGE_INCREMENT) return (globalThis).__TEST_USAGE_INCREMENT(userId, kind)
  const data = read(); if(!data[userId]) data[userId] = { ai:0, lastReset: new Date().toISOString() }; data[userId][kind] = (data[userId][kind] || 0) + 1; write(data); return data[userId]
}

function addTokens(userId, tokens){
  if(!tokens) return getUsage(userId)
  const data = read()
  if(!data[userId]) data[userId] = { ai:0, lastReset: new Date().toISOString(), tokens: 0, tokensByDate: {} }
  data[userId].tokens = (data[userId].tokens || 0) + Number(tokens)
  const day = new Date().toISOString().slice(0,10)
  data[userId].tokensByDate = data[userId].tokensByDate || {}
  data[userId].tokensByDate[day] = (data[userId].tokensByDate[day] || 0) + Number(tokens)
  write(data)
  return data[userId]
}

function addCredits(userId, amount){
  if(!amount) return getUsage(userId)
  const data = read()
  if(!data[userId]) data[userId] = { ai:0, lastReset: new Date().toISOString(), tokens: 0, tokensByDate: {}, credits: 0 }
  data[userId].credits = (data[userId].credits || 0) + Number(amount)
  write(data)
  return data[userId]
}

function aggregateTokens(days=30){
  const data = read()
  const since = new Date()
  since.setDate(since.getDate() - (days-1))
  const res = { tokens: 0, byUser: {} }
  Object.keys(data).forEach(uid => {
    const u = data[uid]
    let sum = 0
    if(u.tokensByDate){
      Object.entries(u.tokensByDate).forEach(([d, v])=>{
        const dt = new Date(d + 'T00:00:00Z')
        if(dt >= since) sum += Number(v || 0)
      })
    }
    if(sum>0){ res.byUser[uid] = sum; res.tokens += sum }
  })
  return res
}

function allowed(userId, tier='free', kind='ai'){
  // test override hook for unit tests -- return value directly if provided
  if((globalThis).__TEST_USAGE_ALLOWED !== undefined) return (globalThis).__TEST_USAGE_ALLOWED(userId, tier, kind)
  const quotas = QUOTAS[tier] || QUOTAS.free; const u = getUsage(userId); if(quotas[kind] === -1) return true; return (u[kind] || 0) < quotas[kind]
}

module.exports = { getUsage, increment, allowed, QUOTAS, addTokens, aggregateTokens, addCredits }

