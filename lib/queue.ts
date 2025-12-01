import fs from 'fs'
import path from 'path'

let RedisClient: any = null
let BullMQ: any = null
try{ const IORedis = require('ioredis'); RedisClient = IORedis }catch(e){ /* ioredis not installed - fall back to file */ }
try{ BullMQ = require('bullmq') }catch(e){ /* bullmq not installed - fall back */ }

const QF = path.resolve(process.cwd(),'data','queue.json')

function ensureFile(){ const dir = path.dirname(QF); if(!fs.existsSync(dir)) fs.mkdirSync(dir); if(!fs.existsSync(QF)) fs.writeFileSync(QF,'[]') }

function enqueueFile(item: any){ ensureFile(); const list = JSON.parse(fs.readFileSync(QF,'utf8')||'[]'); const it = { id:`${Date.now()}`, status:'queued', createdAt: new Date().toISOString(), ...item }; list.push(it); fs.writeFileSync(QF, JSON.stringify(list,null,2)); return it }

function dequeueFile(){ ensureFile(); const list = JSON.parse(fs.readFileSync(QF,'utf8')||'[]'); if(list.length===0) return null; const [first,...rest] = list; fs.writeFileSync(QF, JSON.stringify(rest,null,2)); return first }

let redis: any = null
if(process.env.REDIS_URL && RedisClient){
  try{ redis = new RedisClient(process.env.REDIS_URL) }catch(e){ console.warn('redis connect failed', e) }
}

export async function enqueue(item: any){
  if(redis && BullMQ){
    try{
      // prefer BullMQ queue if available
      const connection = { connection: new RedisClient(process.env.REDIS_URL) }
      const q = new BullMQ.Queue('cvforge:autoapply', connection)
      const it = { id:`${Date.now()}`, status:'queued', createdAt: new Date().toISOString(), ...item }
      await q.add('apply', it)
      return it
    }catch(e){
      // swallow and fall back to list
      console.warn('bullmq enqueue failed, falling back to list', e)
    }
  }
  if(redis){
    const it = { id:`${Date.now()}`, status:'queued', createdAt: new Date().toISOString(), ...item }
    await redis.lpush('cvforge:queue', JSON.stringify(it))
    return it
  }
  return enqueueFile(item)
}

export async function dequeueOne(){
  if(redis){
    // if using BullMQ we recommend using worker to pop jobs; here try list fallback first
    if(BullMQ){
      // don't attempt to pop BullMQ jobs here — return null to encourage worker
      return null
    }
    const raw = await redis.rpop('cvforge:queue')
    if(!raw) return null
    try{ return JSON.parse(raw) }catch(e){ return null }
  }
  return dequeueFile()
}

export async function peekAll(){
  if(redis){
    const arr = await redis.lrange('cvforge:queue', 0, -1)
    return arr.map((s:any)=>{ try{return JSON.parse(s)}catch(e){return null} }).filter(Boolean)
  }
  ensureFile(); return JSON.parse(fs.readFileSync(QF,'utf8')||'[]')
}
