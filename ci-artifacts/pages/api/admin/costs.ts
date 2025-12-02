import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })
  try{
    // aggregate tokens (last N days)
    const days = Number(process.env.COST_AGG_DAYS || 30)
    const usage = require('../../../lib/usage')
    const agg = usage.aggregateTokens(days)
    const tokens = agg.tokens || 0
    const per1k = Number(process.env.OPENAI_COST_PER_1K_TOKENS || 0.002)
    const cost = (tokens/1000) * per1k

    // sum paid invoices in period for simple revenue estimate
    const since = new Date(); since.setDate(since.getDate() - days)
    const invoices = await prisma.invoice.findMany({ where: { createdAt: { gte: since }, status: 'paid' } })
    const revenue = invoices.reduce((s:any,i:any)=> s + (i.amountDue || 0), 0)

    return res.status(200).json({ days, tokens, estimatedOpenAICost: cost, revenue })
  }catch(e){ console.error('admin costs error', e); return res.status(500).json({ error: 'failed' }) }
}
