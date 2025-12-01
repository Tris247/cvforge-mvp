import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { hashPassword } from '../../../lib/hash'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { email, password, name } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        name: name || undefined,
        passwordHash,
        role: 'job_seeker',
      },
      select: { id: true, email: true, name: true },
    })

    return res.status(201).json({ user })
  } catch (err) {
    // keep error messages generic
    console.error('register error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
