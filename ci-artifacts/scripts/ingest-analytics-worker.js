#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

async function ingestFile(filePath, prismaClient, opts){
  const file = filePath
  if(!fs.existsSync(file)) return { imported:0 }
  const raw = fs.readFileSync(file,'utf8')||''
  const lines = raw.split(/\r?\n/).filter(l=>l && l.trim())
  const batchSize = Number(opts && opts.batchSize ? opts.batchSize : (process.env.INGEST_BATCH_SIZE || 500))
  let imported = 0
  for(let i=0;i<lines.length;i+=batchSize){
    const slice = lines.slice(i,i+batchSize)
    const items = []
    for(const l of slice){ try{ const e = JSON.parse(l); items.push({ name: e.name, userId: e.payload && e.payload.userId ? String(e.payload.userId) : null, payload: JSON.stringify(e.payload||{}), source: e.payload && e.payload.source ? String(e.payload.source) : 'file', idempotencyKey: e.id ? String(e.id) : undefined }) }catch(_){ }
    }
    if(items.length===0) continue
    try{
      await prismaClient.event.createMany({ data: items, skipDuplicates: true })
      imported += items.length
    }catch(e){ console.error('batch insert failed', e.message) }
  }
  try{ if(prismaClient && typeof prismaClient.$disconnect === 'function') await prismaClient.$disconnect() }catch(e){}
  // rotate processed file
  if(!(opts && opts.rotate === false)){
    try{ fs.renameSync(file, file + '.processed.' + Date.now()) }catch(e){ console.error('rotate failed', e.message) }
  }
  return { imported }
}

async function main(){
  if(!process.env.DATABASE_URL) return console.log('DATABASE_URL not set — ingestion worker disabled')
  const file = process.env.ANALYTICS_FILE ? path.resolve(process.cwd(), process.env.ANALYTICS_FILE) : path.resolve(process.cwd(),'data','analytics.jsonl')
  if(!fs.existsSync(file)) return console.log('No analytics file to ingest')
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  const res = await ingestFile(file, prisma, {})
  console.log('Ingested', res.imported, 'events to DB')
}

if(require.main === module){
  main().catch(err=>{ console.error(err); process.exit(1) })
}

module.exports = { ingestFile }
