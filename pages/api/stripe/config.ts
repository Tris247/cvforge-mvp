import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(_req: NextApiRequest, res: NextApiResponse){
  if(_req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })

  const configured = !!process.env.STRIPE_SECRET
  const webhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET

  const prices = {
    free: null,
    starter: process.env.STRIPE_PRICE_ID_STARTER || null,
    pro: process.env.STRIPE_PRICE_ID_PRO || null,
    default: process.env.STRIPE_PRICE_ID || null
  }

  return res.status(200).json({ stripeConfigured: configured, webhookConfigured, prices })
}
