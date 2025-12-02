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
  const out = fs.createWriteStream(repairedPath, { flags: 'w' })
  const corrupt = fs.createWriteStream(corruptPath, { flags: 'w' })
  let valid = 0, invalid = 0
  for(const l of lines){
    try{
      JSON.parse(l)
      out.write(l + '\n')
      valid++
    }catch(e){
      corrupt.write(l + '\n')
      invalid++
    }
  }
  out.end(); corrupt.end();
  // wait for streams to finish writing before rotating
  try{
    const { once } = require('events')
    await Promise.all([ once(out, 'finish'), once(corrupt, 'finish') ])
  }catch(e){ /* ignore */ }
  // rotate original
  try{ fs.renameSync(file, file + '.bak.' + Date.now()) }catch(e){}
  // move repaired into place
  try{ fs.renameSync(repairedPath, file) }catch(e){ console.error('Failed to replace original with repaired file', e) }
  console.log('Repaired analytics file:', valid, 'valid lines,', invalid, 'invalid lines — corrupt lines at', corruptPath)
}

main().catch(err=>{ console.error(err); process.exit(1) })
