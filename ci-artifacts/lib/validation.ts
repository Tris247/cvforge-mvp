import { ZodSchema } from 'zod'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

export function withValidation<T extends ZodSchema>(schema: T, handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const input = req.method === 'GET' ? req.query : req.body
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', issues: parsed.error.format() })
    }
    // attach parsed data to req.body for downstream handlers
    if (req.method === 'GET') {
      req.query = parsed.data as any
    } else {
      req.body = parsed.data as any
    }
    return handler(req, res)
  }
}
