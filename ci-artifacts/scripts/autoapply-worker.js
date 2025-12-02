// Simple autoapply worker — polls Redis list (cvforge:queue) or file-backed data/queue.json
const path = require('path')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

let redis = null
if(process.env.REDIS_URL){
  try{ const IORedis = require('ioredis'); redis = new IORedis(process.env.REDIS_URL) }catch(e){ console.warn('ioredis not available or failed to connect - falling back to file queue', e) }
}

const QF = path.resolve(process.cwd(),'data','queue.json')
function ensureFile(){ const dir = path.dirname(QF); if(!fs.existsSync(dir)) fs.mkdirSync(dir); if(!fs.existsSync(QF)) fs.writeFileSync(QF,'[]') }

async function getNext(){
  if(redis){
    const raw = await redis.rpop('cvforge:queue')
    if(!raw) return null
    try{ return JSON.parse(raw) }catch(e){ console.error('invalid job payload', raw); return null }
  }

  ensureFile()
  const list = JSON.parse(fs.readFileSync(QF,'utf8')||'[]')
  if(list.length===0) return null
  const [first, ...rest] = list
  fs.writeFileSync(QF, JSON.stringify(rest, null, 2))
  return first
}

async function processOne(item){
  try{
    console.log('processing item', item.id, item.jobId, item.cvId, 'user', item.userId)
    const record = await prisma.application.create({ data: { jobId: item.jobId, cvId: item.cvId, applicantId: item.userId || null, applicantName: item.applicantName || null, status: item.status || 'applied', via: item.via || 'autoapply' } })
    console.log('created application', record.id)
  }catch(e){ console.error('failed to process item', e) }
}
let running = true

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function run(){
  console.log('autoapply worker started. Redis:', !!redis)
  let backoff = 1000
  while(running){
    try{
      const item = await getNext()
      if(!item){
        backoff = 1000
        await sleep(1000)
        continue
      }
      // reset backoff when we have work
      backoff = 1000
      await processOne(item)
    }catch(e){
      console.error('worker loop error', e)
      // exponential backoff up to 30s
      await sleep(backoff)
      backoff = Math.min(backoff * 2, 30000)
    }
  }
  console.log('autoapply worker stopping')
}

function handleExit(){
  running = false
  console.log('shutdown requested — stopping worker')
  // allow natural exit after loop ends
}

process.on('SIGINT', handleExit)
process.on('SIGTERM', handleExit)

run().catch(err=>{ console.error('worker crashed', err); process.exit(1) })
