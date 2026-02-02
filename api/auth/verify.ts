import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Server not configured', valid: false });
  }

  const SECRET = new TextEncoder().encode(JWT_SECRET);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', valid: false });
  }

  const token = authHeader.substring(7);

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return res.status(200).json({
      valid: true,
      role: payload.role,
      exp: payload.exp
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', valid: false });
  }
}
