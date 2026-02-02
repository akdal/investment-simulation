import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT } from 'jose';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ADMIN_PASSWORD || !JWT_SECRET) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const SECRET = new TextEncoder().encode(JWT_SECRET);

  const { password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Create JWT token (valid for 7 days)
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);

  return res.status(200).json({ token });
}
