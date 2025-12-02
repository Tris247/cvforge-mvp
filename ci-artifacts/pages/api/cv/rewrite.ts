import type { NextApiRequest, NextApiResponse } from 'next'
export default function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({error:'method not allowed'})
  const { content } = req.body || {}
  const suggestion = (String(content) || '').split(/\r?\n/).map(l=> l ? 'Led ' + l : '').join('\n')
  res.status(200).json({ suggestion })
}
