#!/usr/bin/env node
const { startAutoApplyWorker } = require('../workers/autoApplyWorker')

async function main(){
  console.log('starting autoapply worker')
  const wk = startAutoApplyWorker()
  if (!wk) {
    console.log('worker not started (no Redis configured).')
    process.exit(0)
  }
  // keep process alive
  process.on('SIGINT', async () => {
    console.log('shutting down worker')
    try { await wk.close() } catch(e){}
    process.exit(0)
  })
}

main().catch(err=>{ console.error(err); process.exit(1) })
