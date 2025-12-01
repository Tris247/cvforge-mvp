import type { NextApiRequest, NextApiResponse } from 'next'
const fs = require('fs'), path = require('path');
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import { dequeueOne } from '../../../lib/queue'
async function saveApp(app: any){
	// persist to prisma DB
	const record = await prisma.application.create({ data: { jobId: app.jobId, cvId: app.cvId, applicantId: app.userId || null, applicantName: app.applicantName || null, status: app.status || 'applied', via: app.via || 'autoapply' } })
	return record
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse){
	const item = await dequeueOne();
	if(!item) return res.status(200).json({ processed: 0 });
	try{
		const app = await saveApp({ jobId: item.jobId, cvId: item.cvId, userId: item.userId, applicantName: item.applicantName, status: 'applied', via: 'autoapply' })
		return res.status(200).json({ processed: 1, app })
	}catch(err){
		console.error('autoapply process error', err)
		return res.status(500).json({ error: 'failed', detail: String(err) })
	}
}
