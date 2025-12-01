const redisUrl = process.env.REDIS_URL || ''

let BullQueue: any = null
let BullWorker: any = null
let BullQueueScheduler: any = null
try {
  const bull = require('bullmq')
  BullQueue = bull.Queue
  BullWorker = bull.Worker
  BullQueueScheduler = bull.QueueScheduler
} catch (e) {
  // bullmq not installed — fallback/noop will be used
}

export function createQueue(name: string) {
  if (!redisUrl || !BullQueue) {
    // noop fallback for local dev when Redis isn't configured or bullmq missing
    return {
      add: async (payload: any) => ({ id: `local-${Date.now()}`, payload }),
    } as any
  }

  const connection = { connection: { url: redisUrl } }
  const queue = new BullQueue(name, connection)
  // ensure scheduler exists
  new BullQueueScheduler(name, { connection: { url: redisUrl } })
  return queue
}

export function createWorker(name: string, processor: (job: any) => Promise<any>) {
  if (!redisUrl || !BullWorker) {
    console.warn('BullMQ not configured (REDIS_URL missing) or bullmq not installed; worker will not start')
    return null
  }
  const worker = new BullWorker(name, async job => processor(job), { connection: { url: redisUrl } })
  worker.on('failed', (job: any, err: any) => console.error('job failed', job.id, err))
  return worker
}
