import { createWorker } from './queue'
import prisma from '../lib/prisma'

export function normalizeText(s: any) {
  if (!s && s !== 0) return ''
  return String(s).toLowerCase()
}

export function matchesKeywords(text: string, keywords?: string[] | string) {
  if (!keywords) return true // treat missing keywords as match-all
  const kwList = Array.isArray(keywords) ? keywords : String(keywords).split(/[,;|]/).map(k => k.trim()).filter(Boolean)
  if (!kwList.length) return true
  const lc = text.toLowerCase()
  return kwList.some(k => lc.includes(k.toLowerCase()))
}

export function matchesLocation(jobLocation: string | null | undefined, ruleLocation?: string) {
  if (!ruleLocation) return true
  if (!jobLocation) return false
  return normalizeText(jobLocation).includes(normalizeText(ruleLocation))
}

export function matchesRemote(job: any, ruleRemote?: boolean) {
  if (ruleRemote === undefined || ruleRemote === null) return true
  // assume job has `remote` boolean or `location` string containing 'remote'
  if (typeof job.remote === 'boolean') return job.remote === ruleRemote
  if (typeof job.location === 'string') return job.location.toLowerCase().includes('remote') === ruleRemote
  return !ruleRemote
}

async function processor(job: any) {
  const jobData = job?.data || job
  const jobId = jobData.jobId
  console.log('processing autoapply job', jobId || job.id)

  if (!jobId) {
    console.warn('autoapply job missing jobId, skipping')
    return { ok: false, reason: 'missing jobId' }
  }

  try {
    const targetJob = await prisma.job.findUnique({ where: { id: jobId } })
    if (!targetJob) {
      console.warn('job not found for autoapply:', jobId)
      return { ok: false, reason: 'job-not-found' }
    }

    const titleAndDesc = `${targetJob.title || ''} ${targetJob.description || ''}`

    // support both `active` and legacy `enabled` field names for compatibility
    const rules = await prisma.autoApplyRule.findMany({ where: { active: true } })
    console.log(`found ${rules.length} auto-apply rules`)

    let created = 0

    for (const rule of rules) {
      const userId = (rule as any).userId || (rule as any).ownerId || (rule as any).user?.id
      if (!userId) continue

      // matching
      const kwMatch = matchesKeywords(titleAndDesc, (rule as any).keywords)
      const locMatch = matchesLocation(targetJob.location, (rule as any).locations || (rule as any).location)
      const remoteMatch = matchesRemote(targetJob, (rule as any).remoteOnly || (rule as any).remote)
      if (!kwMatch || !locMatch || !remoteMatch) continue

      // check duplicate application
      const exists = await prisma.application.findFirst({ where: { jobId: jobId, userId } })
      if (exists) continue

      // create a lightweight application record (store matched keywords in `message` to avoid schema mismatch)
      try {
        await prisma.application.create({
          data: {
            jobId: jobId,
            userId,
            status: 'pending',
            source: 'autoapply',
            message: (rule as any).keywords ? `matched:${(rule as any).keywords}` : undefined,
          } as any,
        })
        created += 1
      } catch (e) {
        console.warn('failed to create application for rule', (rule as any).id, e)
      }
    }

    console.log(`autoapply created ${created} applications for job ${jobId}`)
    return { ok: true, created }
  } catch (err) {
    console.error('autoApply processor error', err)
    throw err
  }
}

export function startAutoApplyWorker() {
  const worker = createWorker('autoapply', processor)
  return worker
}

// export processor for tests/automation
export { processor }
