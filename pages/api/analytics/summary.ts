import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(_req: NextApiRequest, res: NextApiResponse){
	try{
		const total = await prisma.application.count()

		// per CV stats
		const perCvRaw = await prisma.application.groupBy({ by: ['cvId'], _count: { id: true } })
		const perCv = await Promise.all(perCvRaw.map(async p=> {
			const cv = await prisma.cV.findUnique({ where: { id: p.cvId } })
			return { cvId: p.cvId, cv, count: p._count.id }
		}))

		// top jobs
		const topRaw = await prisma.application.groupBy({ by: ['jobId'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 8 })
		const topJobs = await Promise.all(topRaw.map(async t => {
			const job = await prisma.job.findUnique({ where: { id: t.jobId } })
			return [ job?.title || t.jobId, t._count.id ]
		}))

		return res.status(200).json({ totalApplications: total, perCv, topJobs })
	}catch(err){
		console.error('analytics error', err)
		return res.status(500).json({ error: 'failed' })
	}
}
