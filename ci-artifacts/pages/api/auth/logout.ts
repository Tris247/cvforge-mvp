import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(_req: NextApiRequest, res: NextApiResponse){
  res.setHeader('Set-Cookie', 'cvforge_token=deleted; HttpOnly; Path=/; Max-Age=0')
  return res.status(200).json({ ok: true })
}
