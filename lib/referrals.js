const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const usage = require('./usage')

const FILE = process.env.REFERRALS_FILE ? path.resolve(process.cwd(), process.env.REFERRALS_FILE) : path.resolve(process.cwd(),'data','referrals.json')

function ensure(){ const dir = path.dirname(FILE); if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); if(!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]') }

function read(){ ensure(); return JSON.parse(fs.readFileSync(FILE,'utf8')||'[]') }
function write(v){ fs.writeFileSync(FILE, JSON.stringify(v,null,2)) }

function generateCode(){ return crypto.randomBytes(4).toString('hex') }

function createReferral(referrerUserId){
  const data = read()
  const code = generateCode()
  const rec = { code, referrer: referrerUserId, createdAt: new Date().toISOString(), claimedBy: null, claimedAt: null }
  data.push(rec)
  write(data)
  return rec
}

function claimReferral(code, newUserId){
  const data = read()
  const idx = data.findIndex(r=> r.code === code)
  if(idx === -1) return null
  const rec = data[idx]
  if(rec.claimedBy) return null
  rec.claimedBy = newUserId
  rec.claimedAt = new Date().toISOString()
  // reward referrer with credits (small default)
  try{ usage.addCredits(rec.referrer, 100) }catch(e){}
  // reward new user as well
  try{ usage.addCredits(newUserId, 50) }catch(e){}
  data[idx] = rec
  write(data)
  return rec
}

module.exports = { createReferral, claimReferral }
