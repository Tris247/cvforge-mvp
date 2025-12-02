import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const { email } = req.body || {}
  if(!email) return res.status(400).json({ error: 'email required' })

  const user = await prisma.user.findUnique({ where: { email } })
  if(!user) return res.status(401).json({ error: 'unknown user' })

  const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })

  // set httpOnly cookie
  res.setHeader('Set-Cookie', `cvforge_token=${token}; HttpOnly; Path=/; Max-Age=${7*24*60*60}`)
  try{ const { trackEvent } = require('../../../lib/analytics'); trackEvent('user.login', { userId: user.id, email: user.email }) }catch(e){}
  return res.status(200).json({ ok: true, user: { id: user.id, email: user.email, name: user.name } })
}
