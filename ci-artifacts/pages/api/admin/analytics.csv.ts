import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    res.setHeader('Content-Type','text/csv')
    res.setHeader('Content-Disposition','attachment; filename="admin_analytics.csv"')
    // try DB first
    if(process.env.DATABASE_URL){
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 })
      await prisma.$disconnect()
      const rows = ['name,userId,ts,payload']
      for(const e of events){ rows.push(`${e.name},${e.userId || ''},${e.createdAt.toISOString()},"${(e.payload || '').replace(/"/g,'""')}"`) }
      return res.status(200).send(rows.join('\n'))
    }
    // fallback to file (JSONL) - stream and keep only last 1000 lines to bound memory
    const fs = require('fs')
    const path = require('path')
    const readline = require('readline')
    const file = process.env.ANALYTICS_FILE ? path.resolve(process.cwd(), process.env.ANALYTICS_FILE) : path.resolve(process.cwd(),'data','analytics.jsonl')
    if(!fs.existsSync(file)) return res.status(200).send('')
    const stream = fs.createReadStream(file, { encoding: 'utf8' })
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
    const buf: string[] = []
    for await (const line of rl){ if(!line || !line.trim()) continue; buf.push(line); if(buf.length > 1000) buf.shift() }
    // buf now contains up to last 1000 lines in chronological order
    const rows = ['name,userId,ts,payload']
    for(const l of buf.reverse()){
      try{
        const e = JSON.parse(l)
        rows.push(`${e.name},${(e.payload && e.payload.userId) || ''},${e.ts || ''},"${JSON.stringify(e.payload||{}).replace(/"/g,'""')}"`)
      }catch(_){ }
    }
    return res.status(200).send(rows.join('\n'))
  }catch(err){ console.error(err); return res.status(500).json({ error: 'failed' }) }
}
