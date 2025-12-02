const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
let queue = []
let timer = null

function flush(){
  if(queue.length === 0) return
  const batch = queue
  queue = [];
  (async ()=>{
    try{
      for(const ev of batch){
        try{
          await prisma.event.create({ data: { name: ev.name, userId: ev.userId || null, payload: JSON.stringify(ev.payload || {}), source: ev.source || 'api', idempotencyKey: ev.idempotencyKey || undefined } })
        }catch(e){ /* ignore per-event insert errors */ }
      }
    }catch(e){}
  })()
}

function scheduleFlush(){
  if(timer) return
  timer = setTimeout(()=>{ timer = null; flush() }, 2000)
}

function enqueue(ev){
  queue.push(ev)
  if(queue.length >= 50) flush()
  else scheduleFlush()
}

process.on('exit', ()=>{ flush(); try{ prisma.$disconnect() }catch(e){} })

module.exports = { enqueue, flush }
