#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

async function main(){
  const file = process.env.ANALYTICS_FILE ? path.resolve(process.cwd(), process.env.ANALYTICS_FILE) : path.resolve(process.cwd(),'data','analytics.jsonl')
  if(!fs.existsSync(file)) return console.log('No analytics file found at', file)
  const raw = fs.readFileSync(file,'utf8')||''
  const lines = raw.split(/\r?\n/).filter(l=>l && l.trim())
  const repairedPath = file + '.repaired'
  const corruptPath = file + '.corrupt'
  let valid = 0, invalid = 0
  const repairedLines = []
  const corruptLines = []
  for(const l of lines){
    try{
      JSON.parse(l)
      repairedLines.push(l)
      valid++
    }catch(e){
      corruptLines.push(l)
      invalid++
    }
  }
  // write synchronously to avoid Windows stream/rename races
  fs.writeFileSync(repairedPath, repairedLines.join('\n') + (repairedLines.length ? '\n' : ''), 'utf8')
  fs.writeFileSync(corruptPath, corruptLines.join('\n') + (corruptLines.length ? '\n' : ''), 'utf8')
  // rotate original
  try{ fs.renameSync(file, file + '.bak.' + Date.now()) }catch(e){}
  // move repaired into place
  try{ fs.renameSync(repairedPath, file) }catch(e){ console.error('Failed to replace original with repaired file', e) }
  console.log('Repaired analytics file:', valid, 'valid lines,', invalid, 'invalid lines — corrupt lines at', corruptPath)
}

main().catch(err=>{ console.error(err); process.exit(1) })
