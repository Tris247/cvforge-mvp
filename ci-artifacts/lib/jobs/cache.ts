import prisma from '../../lib/prisma'
import redis from '../redis'

export async function getCachedJob(jobId: string) {
  const key = `job:${jobId}`
  try {
    const cached = await redis.getJson(key)
    if (cached) return cached
  } catch (e) {
    // ignore redis failures and fallback to DB
    console.warn('redis getJson failed', e)
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) return null
  try {
    await redis.setJson(key, job, 60 * 30) // 30 minutes
  } catch (e) {
    console.warn('redis setJson failed', e)
  }
  return job
}

export async function invalidateCachedJob(jobId: string) {
  const key = `job:${jobId}`
  try { await redis.del?.(key) } catch (e) { /* ignore */ }
}
