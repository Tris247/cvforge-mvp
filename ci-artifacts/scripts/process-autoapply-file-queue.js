#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const prisma = require('../lib/prisma')
const { startAutoApplyWorker } = require('../workers/autoApplyWorker')

async function processFileQueue(){
  const queuePath = path.join(process.cwd(), 'data', 'queue.json')
  if (!fs.existsSync(queuePath)) return console.log('no file queue found')
  let arr = JSON.parse(fs.readFileSync(queuePath,'utf8')||'[]')
  if (!arr.length) return console.log('file queue empty')

  // process only autoapply entries
  const toKeep = []
  for (const item of arr) {
    if (item.type !== 'autoapply') { toKeep.push(item); continue }
    try {
      await startAutoApplyWorker().then(w=>{
        if (!w) {
          // no redis; process directly using processor function by requiring file
          const { processor } = require('../workers/autoApplyWorker')
          return processor(item.data)
        }
        // if worker exists, add to queue (not ideal here)
        return w
      })
    } catch (e) {
      console.error('failed to process file-queue item', item, e)
      toKeep.push(item)
    }
  }

  fs.writeFileSync(queuePath, JSON.stringify(toKeep, null, 2))
  console.log('file queue processed')
}

processFileQueue().catch(e=>{ console.error(e); process.exit(1) })
