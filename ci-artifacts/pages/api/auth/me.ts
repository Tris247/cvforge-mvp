import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

function parseToken(req: NextApiRequest): any | null{
  const raw = req.headers.cookie || ''
  const match = raw.match(/cvforge_token=([^;]+)/)
  if(!match) return null
  const token = match[1]
  try{ return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') }catch(e){ return null }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const payload = parseToken(req)
  if(!payload) return res.status(200).json({ user: null })
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if(!user) return res.status(200).json({ user: null })
  return res.status(200).json({ user: { id: user.id, email: user.email, name: user.name } })
}
