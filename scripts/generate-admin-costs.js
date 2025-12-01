#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const usage = require('../lib/usage')

async function getInvoiceRevenue(){
  try{
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    // Sum amountDue for paid invoices (if amountDue is stored in cents)
    const invoices = await prisma.invoice.findMany({ where: { status: 'paid' }, select: { amountDue: true } })
    await prisma.$disconnect()
    const total = invoices.reduce((s,i)=> s + (i.amountDue || 0), 0)
    return total
  }catch(e){
    // Prisma not configured or DB missing — fall back to 0
    return 0
  }
}

async function main(){
  const days = Number(process.env.COST_AGG_DAYS || 30)
  const tokensRes = usage.aggregateTokens ? usage.aggregateTokens(days) : { tokens: 0, byUser: {} }
  const tokens = tokensRes.tokens || 0
  const openaiCostPer1K = Number(process.env.OPENAI_COST_PER_1K_TOKENS || 0.002)
  const estimatedOpenAICost = (tokens / 1000) * openaiCostPer1K
  const revenue = await getInvoiceRevenue()

  const out = []
  out.push('<!doctype html>')
  out.push('<html><head><meta charset="utf-8"><title>Admin Costs</title></head><body>')
  out.push(`<h1>Admin Costs (last ${days} days)</h1>`)
  out.push('<ul>')
  out.push(`<li><strong>Total OpenAI tokens:</strong> ${tokens}</li>`)
  out.push(`<li><strong>Estimated OpenAI cost:</strong> $${estimatedOpenAICost.toFixed(4)}</li>`)
  out.push(`<li><strong>Revenue (paid invoices):</strong> ${revenue ? '$' + (revenue/100).toFixed(2) + ' (assumes cents)' : '$0.00'}</li>`)
  out.push(`<li><strong>Net (rev - est AI):</strong> $${((revenue/100) - estimatedOpenAICost).toFixed(4)}</li>`)
  out.push('</ul>')

  out.push('<h2>Per-user token usage</h2>')
  out.push('<table border="1" cellpadding="6"><thead><tr><th>User</th><th>Tokens</th></tr></thead><tbody>')
  const byUser = tokensRes.byUser || {}
  Object.keys(byUser).sort((a,b)=> byUser[b]-byUser[a]).forEach(uid => {
    out.push(`<tr><td>${uid}</td><td>${byUser[uid]}</td></tr>`)
  })
  out.push('</tbody></table>')

  out.push(`<p>Generated at ${new Date().toISOString()}</p>`)
  out.push('</body></html>')

  const outPath = path.resolve(process.cwd(),'admin_costs.html')
  fs.writeFileSync(outPath, out.join('\n'), 'utf8')
  console.log('Wrote', outPath)
}

main().catch(err=>{ console.error(err); process.exit(1) })
