import React from 'react'
import { GetServerSideProps } from 'next'

type Props = {
  stats: { [k:string]: number }
  since: string
}

export default function AdminAnalytics({ stats, since }: Props){
  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Analytics</h1>
      <p>Since: {since}</p>
      <p><a href="/api/admin/analytics.csv">Download CSV (latest 1000)</a></p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {Object.entries(stats).map(([k,v])=> (
          <div key={k} style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize:12, color:'#666' }}>{k}</div>
            <div style={{ fontSize:24, fontWeight:700, marginTop:8 }}>{v}</div>
            <div style={{ height:12, background:'#f0f0f0', marginTop:12 }}>
              <div style={{ width: `${Math.min(100, (v/Math.max(1,Object.values(stats).reduce((a,b)=> a+b,0)))*100)}%`, height:12, background:'#4caf50' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const since = new Date().toISOString()
  const stats: any = { }
  // try DB first
  if(process.env.DATABASE_URL){
    try{
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      const names = ['user.signup','user.login','cv.save','ai.generate.request','marketplace.application.created','checkout.started','checkout.completed']
      for(const n of names){
        try{ stats[n] = await prisma.event.count({ where: { name: n } }) }catch(e){ stats[n]=0 }
      }
      try{ await prisma.$disconnect() }catch(e){}
      return { props: { stats, since } }
    }catch(e){ /* fallthrough */ }
  }

  // fallback to file-backed analytics (JSONL). Stream file and aggregate counts without loading entire file.
  try{
    const fs = require('fs')
    const path = require('path')
    const readline = require('readline')
    const file = process.env.ANALYTICS_FILE ? path.resolve(process.cwd(), process.env.ANALYTICS_FILE) : path.resolve(process.cwd(),'data','analytics.jsonl')
    if(fs.existsSync(file)){
      const stream = fs.createReadStream(file, { encoding: 'utf8' })
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
      for await (const line of rl){ if(!line || !line.trim()) continue; try{ const e = JSON.parse(line); stats[e.name] = (stats[e.name]||0) + 1 }catch(_){} }
    }
  }catch(e){ }

  return { props: { stats, since } }
}
