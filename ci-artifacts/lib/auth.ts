import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import type { NextApiRequest } from 'next'

const prisma = new PrismaClient()

export async function getUserFromReq(req: NextApiRequest){
  const raw = req.headers?.cookie || ''
  const match = String(raw).match(/cvforge_token=([^;]+)/)
  if(!match) return null
  const token = match[1]
  try{
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    if(!payload?.sub) return null
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    return user || null
  }catch(e){
    return null
  }
}

export function parseTokenFromReq(req: NextApiRequest){
  try{ const raw = req.headers?.cookie || ''; const m = String(raw).match(/cvforge_token=([^;]+)/); if(!m) return null; return jwt.verify(m[1], process.env.JWT_SECRET || 'dev-secret') }catch(e){ return null }
}
