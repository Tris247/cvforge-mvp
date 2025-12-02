#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

async function main(){
  const file = process.env.ANALYTICS_FILE ? path.resolve(process.cwd(), process.env.ANALYTICS_FILE) : path.resolve(process.cwd(),'data','analytics.jsonl')
  if(!fs.existsSync(file)){ console.log('No analytics file found at', file); return }
  const raw = fs.readFileSync(file,'utf8')||''
  const lines = raw.split(/\r?\n/).filter(l=>l && l.trim())
  const arr = []
  for(const l of lines){ try{ arr.push(JSON.parse(l)) }catch(e){ /* skip malformed */ } }
  if(arr.length === 0){ console.log('No events to sync'); return }
  if(!process.env.DATABASE_URL){ console.log('DATABASE_URL not configured; cannot sync to DB'); return }

  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  let imported = 0
  for(const e of arr){
    try{
      // use id as idempotency key if present
      const idKey = e.id ? String(e.id) : undefined
      await prisma.event.create({ data: { name: e.name, userId: e.payload && e.payload.userId ? String(e.payload.userId) : null, payload: JSON.stringify(e.payload || {}), source: e.payload && e.payload.source ? String(e.payload.source) : 'file', idempotencyKey: idKey } })
      imported++
    }catch(err){
      // ignore duplicates or errors
      // if unique constraint violation, skip
      // console.error('sync event failed', err.message)
    }
  }
  await prisma.$disconnect()
  console.log('Imported', imported, 'events to DB')
}

main().catch(err=>{ console.error(err); process.exit(1) })
