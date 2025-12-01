#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const legacyPath = path.resolve(process.cwd(), 'data', 'analytics.json')
const outPath = process.env.ANALYTICS_FILE ? path.resolve(process.cwd(), process.env.ANALYTICS_FILE) : path.resolve(process.cwd(), 'data', 'analytics.jsonl')

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) }

async function run(){
  if(!fs.existsSync(legacyPath)){
    console.log('No legacy analytics file found at', legacyPath)
    process.exit(0)
  }
  try{
    const raw = fs.readFileSync(legacyPath, 'utf8')
    const arr = JSON.parse(raw || '[]')
    if(!Array.isArray(arr)){
      console.error('Legacy file is not a JSON array. Aborting.')
      process.exit(2)
    }
    ensureDir(path.dirname(outPath))
    const stream = fs.createWriteStream(outPath, { flags: 'a' })
    for(const e of arr){ try{ stream.write(JSON.stringify(e) + '\n') }catch(err){ console.warn('write error', err) } }
    stream.end()
    const bak = legacyPath + '.converted.bak'
    fs.renameSync(legacyPath, bak)
    console.log('Converted legacy analytics to', outPath, 'backup saved to', bak)
  }catch(e){
    console.error('Failed to convert legacy analytics:', e)
    process.exit(1)
  }
}

run()
