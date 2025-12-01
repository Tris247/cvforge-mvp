import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getUserFromReq } from '../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if(req.method === 'GET'){
      const apps = await prisma.application.findMany({ orderBy: { createdAt: 'desc' }, include: { job: true, cv: true, applicant: true } })
      return res.status(200).json({ applications: apps })
    }

    if(req.method === 'POST'){
      const { jobId, cvId, applicantName, status, via } = req.body || {}
      if(!jobId || !cvId) return res.status(400).json({ error: 'missing jobId or cvId' })
      const user = await getUserFromReq(req)
      const application = await prisma.application.create({ data: { jobId, cvId, applicantId: user ? user.id : null, applicantName: user ? (user.name || user.email) : (applicantName || null), status: status || 'applied', via: via || null } })
      return res.status(200).json({ application })
    }

    res.status(405).json({ error: 'method not supported' })
  }catch(err){
    console.error('applications api error', err)
    res.status(500).json({ error: 'server error' })
  }
}
