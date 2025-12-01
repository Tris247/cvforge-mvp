import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || ''
const redis = redisUrl ? new Redis(redisUrl) : new Redis()

export async function getJson(key: string): Promise<any | null> {
  const v = await redis.get(key)
  if(!v) return null
  try{ return JSON.parse(v) }catch(e){ return null }
}

export async function setJson(key: string, value: any, ttlSeconds = 1800){
  const s = JSON.stringify(value)
  if(ttlSeconds > 0){
    await redis.set(key, s, 'EX', ttlSeconds)
  }else{
    await redis.set(key, s)
  }
}

export async function cacheJob(jobId: string, jobObj: any, ttlSeconds = 1800){
  const key = `job:${jobId}`
  await setJson(key, jobObj, ttlSeconds)
}

export async function getCachedJob(jobId: string){
  return await getJson(`job:${jobId}`)
}

// Simple rate limiter using INCR and EXPIRE
export async function rateLimit(key: string, limit: number, windowSeconds: number){
  const current = await redis.incr(key)
  if(current === 1){ await redis.expire(key, windowSeconds) }
  return { allowed: current <= limit, remaining: Math.max(0, limit - current), current }
}

export default redis
