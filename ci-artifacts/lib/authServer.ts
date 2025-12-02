import { getToken } from 'next-auth/jwt'
import type { NextApiRequest, NextApiResponse } from 'next'

export async function getUserFromReq(req: NextApiRequest) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return null
  return { id: token.sub as string, email: token.email as string | undefined, role: token.role as string | undefined }
}

export async function requireRole(req: NextApiRequest, res: NextApiResponse, roles: string | string[]) {
  const user = await getUserFromReq(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  const allowed = Array.isArray(roles) ? roles.includes(user.role || '') : (user.role === roles)
  if (!allowed) {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }
  return user
}
