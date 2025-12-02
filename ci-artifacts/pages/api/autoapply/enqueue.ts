import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { withValidation } from '../../../lib/validation'
import { createQueue } from '../../../workers/queue'
import fs from 'fs'
import path from 'path'

const BodySchema = z.object({ jobId: z.string().min(1) })

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { jobId } = req.body as { jobId: string }

  // prefer Redis/BullMQ queue when available, otherwise append to file queue
  const redisUrl = process.env.REDIS_URL || ''
  if (redisUrl) {
    try {
      const q = createQueue('autoapply')
      const job = await q.add('autoapply', { jobId })
      return res.status(201).json({ ok: true, jobId: job.id })
    } catch (err) {
      console.error('enqueue bullmq error', err)
      // fallback to file
    }
  }

  // file fallback: append to data/queue.json
  try {
    const queuePath = path.join(process.cwd(), 'data', 'queue.json')
    let arr: any[] = []
    if (fs.existsSync(queuePath)) arr = JSON.parse(fs.readFileSync(queuePath, 'utf8') || '[]')
    arr.push({ id: `file-${Date.now()}`, type: 'autoapply', data: { jobId } })
    fs.mkdirSync(path.dirname(queuePath), { recursive: true })
    fs.writeFileSync(queuePath, JSON.stringify(arr, null, 2))
    return res.status(201).json({ ok: true, jobId: `file-${Date.now()}` })
  } catch (err) {
    console.error('enqueue file fallback error', err)
    return res.status(500).json({ error: 'enqueue failed' })
  }
}

export default withValidation(BodySchema, handler)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
import { enqueue as queueEnqueue, dequeueOne } from '../../../lib/queue'
export default async function handler(req: NextApiRequest, res: NextApiResponse){
	if(req.method === 'POST'){
		const user = await getUserFromReq(req)
		if(!user) return res.status(401).json({ error: 'not authenticated' })
		const body = req.body || {}
		const it = await queueEnqueue({ jobId: body.jobId, cvId: body.cvId, userId: user.id, applicantName: user.name || user.email, jobTitle: body.jobTitle })
		return res.status(200).json(it)
	}

	if(req.method === 'GET'){
		const item = await dequeueOne();
		return res.status(200).json({ processed: item ? 1 : 0, item })
	}

	return res.status(405).json({error:'method not allowed'})
}
