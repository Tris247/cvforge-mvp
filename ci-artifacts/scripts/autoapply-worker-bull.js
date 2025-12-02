// BullMQ worker for autoapply queue — requires REDIS_URL environment variable
const { Worker, Queue } = require('bullmq')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

if(!process.env.REDIS_URL){
  console.error('REDIS_URL is required to run bull worker')
  process.exit(1)
}

const connection = { connection: process.env.REDIS_URL }
const queueName = 'cvforge:autoapply'

const worker = new Worker(queueName, async (job) => {
  const item = job.data
  console.log('Bull worker processing job', job.id, item)
  try{
    const rec = await prisma.application.create({ data: { jobId: item.jobId, cvId: item.cvId, applicantId: item.userId || null, applicantName: item.applicantName || null, status: item.status || 'applied', via: item.via || 'autoapply' } })
    console.log('Saved application', rec.id)
  }catch(e){
    console.error('Worker failed to save application', e)
    throw e
  }
}, connection)

worker.on('failed', (job, err) => { console.error('job failed', job?.id, err) })
worker.on('completed', (job) => { console.log('job completed', job?.id) })

console.log('BullMQ worker started, queue:', queueName)

// graceful shutdown
function graceful(){
  console.log('Bull worker shutting down...')
  worker.close().then(()=> process.exit(0)).catch(()=> process.exit(1))
}
process.on('SIGINT', graceful)
process.on('SIGTERM', graceful)
