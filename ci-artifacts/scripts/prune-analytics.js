#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const DAYS = Number(process.env.PRUNE_DAYS || 90)
const cutoff = Date.now() - DAYS * 24 * 60 * 60 * 1000

async function pruneDb(){
  if(!process.env.DATABASE_URL) return console.log('DATABASE_URL not set — skipping DB prune')
  try{
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    const res = await prisma.event.deleteMany({ where: { createdAt: { lt: new Date(cutoff) } } })
    console.log('Pruned events from DB:', res.count)
    await prisma.$disconnect()
  }catch(e){ console.error('DB prune failed', e) }
}

function pruneFiles(){
  const file = process.env.ANALYTICS_FILE ? path.resolve(process.cwd(), process.env.ANALYTICS_FILE) : path.resolve(process.cwd(),'data','analytics.jsonl')
  if(!fs.existsSync(file)) return console.log('No analytics file to prune')
  try{
    const raw = fs.readFileSync(file,'utf8')||''
    const lines = raw.split(/\r?\n/).filter(l=>l && l.trim())
    const keptLines = []
    let removed = 0
    for(const l of lines){
      try{
        const e = JSON.parse(l)
        const ts = e.ts || e.createdAt || null
        if(!ts){ keptLines.push(l); continue }
        const t = new Date(ts).getTime()
        if(t >= cutoff) keptLines.push(l)
        else removed++
      }catch(err){ /* malformed => skip */ }
    }
    fs.writeFileSync(file, keptLines.join('\n') + (keptLines.length ? '\n' : ''))
    console.log('Pruned file-backed events:', removed)
  }catch(e){ console.error('File prune failed', e) }
}

async function main(){
  console.log(`Pruning events older than ${DAYS} days (cutoff ${new Date(cutoff).toISOString()})`)
  await pruneDb()
  pruneFiles()
}

main().catch(err=>{ console.error(err); process.exit(1) })
