import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromReq } from '../../../lib/auth'
const { listNotifications } = require('../../../lib/notifications')

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    // query param target allows fetching notifications for a specific identity (tests)
    const { target } = req.query
    if(target) return res.status(200).json({ notifications: listNotifications(String(target)) })

    // otherwise require authenticated user
    const user = await getUserFromReq(req)
    if(!user) return res.status(401).json({ error: 'not authenticated' })
    return res.status(200).json({ notifications: listNotifications(user.id) })
  }catch(err){ console.error('notifications api error', err); return res.status(500).json({ error: 'failed' }) }
}
